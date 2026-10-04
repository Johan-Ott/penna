import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ask, open, save } from "@tauri-apps/plugin-dialog";
import { exists, readFile, rename, watch, writeFile } from "@tauri-apps/plugin-fs";
import { documentDir, homeDir } from "@tauri-apps/api/path";
import { tauriFileSystem } from "../storage/tauriFileSystem.js";
import type { FileKind, PickKind, Platform } from "./platform.js";

// Windows paths come with backslashes and sometimes a trailing one; Penna uses forward slashes.
const withForwardSlashes = (path: string) => path.replaceAll("\\", "/").replace(/\/$/, "");

const askToCloseAnyway = () =>
  ask("Scenen kunde inte sparas. Stänger du nu försvinner det du skrivit sedan senaste sparning.", {
    title: "Osparad text",
    kind: "warning",
    okLabel: "Stäng ändå",
    cancelLabel: "Fortsätt skriva",
  });

// Written beside the target and renamed, so a crash never leaves half a file. The dialog only
// grants the chosen path, so outside the home folder the file is written directly, still whole.
async function saveFile(suggestedName: string, bytes: Uint8Array, kind: FileKind) {
  const path = await save({
    defaultPath: suggestedName,
    filters: [{ name: kind.name, extensions: [kind.extension] }],
  });
  if (!path) return null;
  const temp = `${path}.penna-tmp`;
  try {
    await writeFile(temp, bytes);
    await rename(temp, path);
  } catch {
    await writeFile(path, bytes);
  }
  return withForwardSlashes(path);
}

// The dialog grants Penna the picked file, so it can be read wherever it lies.
async function pickFile(kind: PickKind) {
  const picked = await open({ filters: [kind] });
  if (typeof picked !== "string") return null;
  return { path: withForwardSlashes(picked), bytes: await readFile(picked) };
}

export const tauriPlatform: Platform = {
  saveFile,
  pickFile,
  fileSystem: tauriFileSystem,
  setSpellLanguage: (language) => invoke("set_spell_language", { language }),
  knownFolders: async () => ({
    home: withForwardSlashes(await homeDir()),
    documents: withForwardSlashes(await documentDir()),
  }),
  folderExists: (path) => exists(path),

  async pickFolder() {
    const picked = await open({ directory: true });
    return typeof picked === "string" ? withForwardSlashes(picked) : null;
  },

  watchFolder: (dir, onChange) => watch(dir, onChange, { recursive: true, delayMs: 300 }),

  guardClose(isSafeToClose) {
    const appWindow = getCurrentWindow();
    const stopListening = appWindow.onCloseRequested(async (event) => {
      if (await isSafeToClose()) return;
      event.preventDefault();
      if (await askToCloseAnyway()) await appWindow.destroy();
    });
    return () => void stopListening.then((stop) => stop());
  },
};
