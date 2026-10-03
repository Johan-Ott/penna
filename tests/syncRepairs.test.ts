import type { Node } from "prosemirror-model";
import { describe, expect, it } from "vitest";
import { createSceneSession, openScene, sceneEdited } from "../src/app/sceneSession";
import {
  copyDevice,
  keepVersion,
  readSyncCopy,
  restoreCrashText,
  setAsideCrashText,
} from "../src/app/syncRepairs";
import { parseMarkdown } from "../src/manuscript/parseMarkdown";
import { createMemoryFileSystem } from "../src/storage/memoryFileSystem";

const SCENE_ID = "01J9Z4K2QX";
const SCENE_PATH = `/bok/scenes/${SCENE_ID}.md`;
const COPY_NAME = `${SCENE_ID} (Elins iPhone's conflicted copy 2026-10-03).md`;
const COPY_PATH = `/bok/scenes/${COPY_NAME}`;
const COPY = { sceneId: SCENE_ID, fileName: COPY_NAME };
const MINE = `---\nid: ${SCENE_ID}\ntitle: Köket\n---\nIsen var grå och orörlig.\n`;
const THEIRS = `---\nid: ${SCENE_ID}\ntitle: Köket\n---\nIsen var tung och grå.\n`;

function setup(extra: Record<string, string> = {}) {
  const files = createMemoryFileSystem({ [SCENE_PATH]: MINE, [COPY_PATH]: THEIRS, ...extra });
  let editorDoc: Node | null = null;
  const session = createSceneSession(files, {
    editor: { load: (doc) => (editorDoc = doc), currentDoc: () => editorDoc },
    onScene: () => undefined,
    onConflict: () => undefined,
    onSaveStatus: () => undefined,
  });
  const type = (markdown: string) => {
    editorDoc = parseMarkdown(markdown);
    sceneEdited(session, editorDoc);
  };
  return { files, session, type, editorText: () => editorDoc?.textContent };
}

describe("copyDevice", () => {
  it("names the device from Dropbox, Swedish Dropbox and OneDrive copies", () => {
    const names = [
      COPY_NAME,
      `${SCENE_ID} (Elins iPhone:s motstridiga kopia 2026-10-03).md`,
      `${SCENE_ID}-ELINS-LAPTOP.md`,
    ];

    const devices = names.map(copyDevice);

    expect(devices).toEqual(["Elins iPhone", "Elins iPhone", "ELINS-LAPTOP"]);
  });

  it("gives null when the copy does not say where it came from", () => {
    const name = `${SCENE_ID} 2.md`;

    const device = copyDevice(name);

    expect(device).toBeNull();
  });
});

describe("keepVersion", () => {
  it("reads the scene and the copy side by side", async () => {
    const { files } = setup();

    const versions = await readSyncCopy(files, "/bok", COPY);

    expect(versions).toEqual({ editorText: MINE, diskText: THEIRS });
  });

  it("keeping this computer's version sets the copy aside in trash/, never deleting it", async () => {
    const { files, session } = setup();

    await keepVersion(session, "/bok", COPY, "mine");

    expect(await files.readText(SCENE_PATH)).toBe(MINE);
    expect(await files.list("/bok/scenes")).toEqual([`${SCENE_ID}.md`]);
    expect(await files.readText(`/bok/trash/${COPY_NAME}`)).toBe(THEIRS);
  });

  it("keeping the other version sets this computer's text aside, with what was just typed", async () => {
    const { files, session, type, editorText } = setup();
    await openScene(session, "/bok", SCENE_ID);
    type("Isen var grå och orörlig. Fyren blinkade.\n");

    await keepVersion(session, "/bok", COPY, "theirs");

    expect(await files.readText(SCENE_PATH)).toBe(THEIRS);
    expect(editorText()).toBe("Isen var tung och grå.");
    const trash = await files.list("/bok/trash");
    expect(await files.readText(`/bok/trash/${trash[0] ?? ""}`)).toContain("Fyren blinkade.");
  });

  it("keeping both makes the copy a scene of its own, named after the device", async () => {
    const { files, session } = setup();

    const newId = await keepVersion(session, "/bok", COPY, "both");

    const newScene = await files.readText(`/bok/scenes/${newId ?? ""}.md`);
    expect(newScene).toContain("title: Köket (från Elins iPhone)");
    expect(newScene).toContain("Isen var tung och grå.");
    expect(await files.readText(SCENE_PATH)).toBe(MINE);
    expect(await files.list("/bok/scenes")).not.toContain(COPY_NAME);
  });

  it("never overwrites something already in trash/", async () => {
    const { files, session } = setup({ [`/bok/trash/${COPY_NAME}`]: "äldre" });

    await keepVersion(session, "/bok", COPY, "mine");

    expect(await files.readText(`/bok/trash/${COPY_NAME}`)).toBe("äldre");
    expect(await files.list("/bok/trash")).toHaveLength(2);
  });
});

describe("crash text", () => {
  const TEMP = { tempPath: `${SCENE_PATH}.penna-tmp`, targetPath: SCENE_PATH };
  const CRASH = `---\nid: ${SCENE_ID}\ntitle: Köket\n---\nIsen var grå. Skrivet före kraschen.\n`;

  it("restoring puts the newer text in the scene", async () => {
    const { files } = setup({ [TEMP.tempPath]: CRASH });

    await restoreCrashText(files, TEMP);

    expect(await files.readText(SCENE_PATH)).toBe(CRASH);
    expect(await files.list("/bok/scenes")).not.toContain(`${SCENE_ID}.md.penna-tmp`);
  });

  it("setting it aside moves it to trash/ as a readable scene file", async () => {
    const { files } = setup({ [TEMP.tempPath]: CRASH });

    await setAsideCrashText(files, "/bok", TEMP);

    expect(await files.readText(SCENE_PATH)).toBe(MINE);
    expect(await files.readText(`/bok/trash/${SCENE_ID} (osparad vid krasch).md`)).toBe(CRASH);
  });
});
