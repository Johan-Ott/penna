// Spike shell: pick a folder, edit one scene with autosave, react to changes from sync.
import { recoverTemp, writeAtomic } from "../src/storage/atomicWrite.js";
import { createAutosave, type SaveStatus } from "../src/storage/autosave.js";
import { joinPath } from "../src/storage/fileSystem.js";
import { openProjectFolder, type OpenedProject } from "../src/storage/projectFolder.js";
import type { SaveFailure } from "../src/storage/saveError.js";
import { newSceneId } from "../src/storage/sceneId.js";
import { decideExternalChange } from "../src/storage/syncFiles.js";
import { tauriFileSystem as fileSystem } from "../src/storage/tauriFileSystem.js";

const FAILURE_MESSAGES: Record<SaveFailure, string> = {
  blocked: "Filen används av ett annat program, ofta molnsynken, eller så är den skrivskyddad.",
  diskFull: "Disken är full. Frigör utrymme så sparar Penna så snart det går.",
  readOnly: "Enheten är skrivskyddad.",
  folderMissing: "Projektmappen hittas inte. Kontrollera att disken eller molnmappen är ansluten.",
  unknown: "Okänt fel.",
};

const state = { dir: "", sceneId: "" };

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`missing #${id}`);
  return found as T;
}

const editor = element<HTMLTextAreaElement>("editor");
const status = (text: string) => (element("status").textContent = text);
const scenesDir = () => joinPath(state.dir, "scenes");
const scenePath = (id: string) => joinPath(scenesDir(), `${id}.md`);

function showSaveStatus(saveStatus: SaveStatus) {
  element("save-banner").hidden = saveStatus.kind === "saved";
  if (saveStatus.kind === "saved") {
    status(`Sparad ${new Date().toLocaleTimeString("sv-SE")}`);
    return;
  }
  element("save-banner-text").textContent =
    `Scenen kunde inte sparas. ${FAILURE_MESSAGES[saveStatus.reason]} ` +
    "Texten finns kvar här och Penna försöker igen var tionde sekund.";
}

const autosave = createAutosave({
  write: (text) => writeAtomic(fileSystem, scenePath(state.sceneId), text),
  onStatus: showSaveStatus,
});

function fillList(listId: string, items: { label: string; onClick?: () => void }[]) {
  element(listId).replaceChildren(
    ...items.map(({ label, onClick }) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.textContent = label;
      button.disabled = !onClick;
      if (onClick) button.onclick = onClick;
      item.append(button);
      return item;
    }),
  );
}

function render(project: OpenedProject) {
  const openable = project.scenes.map((id) => ({ label: id, onClick: () => void openScene(id) }));
  fillList("scenes", openable);
  fillList(
    "conflicts",
    project.conflicts.map((copy) => ({ label: copy.fileName })),
  );
  fillList(
    "not-downloaded",
    project.notDownloaded.map((ref) => ({ label: `Hämtar… ${ref.sceneId}` })),
  );
  fillList(
    "recoverable",
    project.recoverable.map((temp) => ({
      label: `Återställ ${temp.targetPath.split("/").pop() ?? ""}`,
      onClick: () => void recoverTemp(fileSystem, temp).then(refresh),
    })),
  );
}

async function refresh() {
  render(await openProjectFolder(fileSystem, state.dir));
}

// Leaving a scene whose text is not on disk would lose that text, so the switch waits.
async function openScene(id: string) {
  if (!(await autosave.flush())) return status("Scenen måste sparas innan du byter scen.");
  const text = await fileSystem.readText(scenePath(id));
  state.sceneId = id;
  autosave.release();
  autosave.loaded(text);
  editor.value = text;
  editor.disabled = false;
  element("conflict").hidden = true;
  status(id);
}

async function newScene() {
  const id = newSceneId();
  await window.__TAURI__.fs.mkdir(scenesDir(), { recursive: true });
  const frontMatter = `---\nid: ${id}\ntitle: Ny scen\nstatus: idé\n---\n`;
  await writeAtomic(fileSystem, scenePath(id), frontMatter);
  await refresh();
  await openScene(id);
}

async function onDiskChange() {
  await refresh();
  if (!state.sceneId) return;
  const diskText = await fileSystem.readText(scenePath(state.sceneId)).catch(() => null);
  if (diskText === null) return status("Scenfilen finns inte längre på disken.");
  const lastSavedText = autosave.lastSavedText();
  const decision = decideExternalChange({ diskText, editorText: editor.value, lastSavedText });
  if (decision === "reload") {
    editor.value = diskText;
    autosave.loaded(diskText);
    status("Laddade om ändring från disken.");
  }
  if (decision !== "conflict") return;
  autosave.hold();
  element<HTMLTextAreaElement>("disk-text").value = diskText;
  element("conflict").hidden = false;
}

async function resolveConflict(keepMine: boolean) {
  const diskText = element<HTMLTextAreaElement>("disk-text").value;
  element("conflict").hidden = true;
  if (!keepMine) editor.value = diskText;
  autosave.loaded(diskText);
  autosave.release();
  autosave.changed(editor.value);
  await autosave.flush();
}

async function pickFolder() {
  const picked = await window.__TAURI__.dialog.open({ directory: true });
  if (typeof picked !== "string") return;
  state.dir = picked.replaceAll("\\", "/");
  element("folder").textContent = state.dir;
  element<HTMLButtonElement>("new-scene").disabled = false;
  await refresh();
  await window.__TAURI__.fs.watch(state.dir, () => void onDiskChange(), {
    recursive: true,
    delayMs: 300,
  });
}

async function confirmClose(event: { preventDefault: () => void }) {
  if (await autosave.flush()) return;
  event.preventDefault();
  const shouldClose = await window.__TAURI__.dialog.ask(
    "Scenen kunde inte sparas. Stänger du nu försvinner det du skrivit sedan senaste sparning.",
    {
      title: "Osparad text",
      kind: "warning",
      okLabel: "Stäng ändå",
      cancelLabel: "Fortsätt skriva",
    },
  );
  if (shouldClose) await window.__TAURI__.window.getCurrentWindow().destroy();
}

editor.oninput = () => autosave.changed(editor.value);
editor.onblur = () => void autosave.flush();
element("pick").onclick = () => void pickFolder();
element("new-scene").onclick = () => void newScene();
element("keep-mine").onclick = () => void resolveConflict(true);
element("take-disk").onclick = () => void resolveConflict(false);
element("retry-save").onclick = () => void autosave.flush();
void window.__TAURI__.window.getCurrentWindow().onCloseRequested(confirmClose);
