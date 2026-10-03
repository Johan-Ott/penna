import type { Node } from "prosemirror-model";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkDisk,
  closeScene,
  createSceneSession,
  openScene,
  renameScene,
  resolveConflict,
  sceneEdited,
  type DiskConflict,
} from "../src/app/sceneSession";
import { parseMarkdown } from "../src/manuscript/parseMarkdown";
import { createMemoryFileSystem } from "../src/storage/memoryFileSystem";

const SCENE_PATH = "/bok/scenes/01J9Z4K2QX.md";
const SCENE = "---\nid: 01J9Z4K2QX\ntitle: Köket\n---\nBrevet låg där.\n";

function setup() {
  const files = createMemoryFileSystem({ [SCENE_PATH]: SCENE });
  let editorDoc: Node | null = null;
  const conflicts: (DiskConflict | null)[] = [];
  const session = createSceneSession(files, {
    editor: { load: (doc) => (editorDoc = doc), currentDoc: () => editorDoc },
    onScene: () => undefined,
    onConflict: (conflict) => conflicts.push(conflict),
    onSaveStatus: () => undefined,
  });
  const type = (markdown: string) => {
    editorDoc = parseMarkdown(markdown);
    sceneEdited(session, editorDoc);
  };
  return { files, session, conflicts, type, editorText: () => editorDoc?.textContent };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("scene session", () => {
  it("opens a scene into the editor", async () => {
    const { session, editorText } = setup();

    await openScene(session, "/bok", "01J9Z4K2QX");

    expect(editorText()).toBe("Brevet låg där.");
    expect(session.scene?.title).toBe("Köket");
  });

  it("saves the front matter and the new text one second after typing stops", async () => {
    const { files, session, type } = setup();
    await openScene(session, "/bok", "01J9Z4K2QX");

    type("Brevet låg *där*.\n");
    await vi.advanceTimersByTimeAsync(1000);

    expect(await files.readText(SCENE_PATH)).toBe(
      "---\nid: 01J9Z4K2QX\ntitle: Köket\n---\nBrevet låg *där*.\n",
    );
  });

  it("reloads quietly when the file changes on disk and nothing is unsaved", async () => {
    const { files, session, editorText } = setup();
    await openScene(session, "/bok", "01J9Z4K2QX");

    await files.writeText(SCENE_PATH, SCENE.replace("där", "på bordet"));
    await checkDisk(session);

    expect(editorText()).toBe("Brevet låg på bordet.");
  });

  it("asks the writer when the disk and the editor both changed", async () => {
    const { files, session, conflicts, type } = setup();
    await openScene(session, "/bok", "01J9Z4K2QX");
    type("Brevet låg kvar.\n");

    await files.writeText(SCENE_PATH, SCENE.replace("där", "på bordet"));
    await checkDisk(session);
    await vi.advanceTimersByTimeAsync(5000);

    expect(conflicts.at(-1)?.diskText).toContain("på bordet");
    expect(await files.readText(SCENE_PATH)).toContain("på bordet");
  });

  it("keeps both versions as two scenes", async () => {
    const { files, session, conflicts, type } = setup();
    await openScene(session, "/bok", "01J9Z4K2QX");
    type("Brevet låg kvar.\n");
    await files.writeText(SCENE_PATH, SCENE.replace("där", "på bordet"));
    await checkDisk(session);
    const conflict = conflicts.at(-1);

    if (conflict) await resolveConflict(session, "both", conflict);

    const sceneFiles = await files.list("/bok/scenes");
    const otherName = sceneFiles.find((name) => name !== "01J9Z4K2QX.md") ?? "";
    expect(await files.readText(SCENE_PATH)).toContain("Brevet låg kvar.");
    expect(await files.readText(`/bok/scenes/${otherName}`)).toContain("på bordet");
    expect(await files.readText(`/bok/scenes/${otherName}`)).toContain("Köket (andra versionen)");
  });
});

describe("renameScene", () => {
  it("renames the open scene at once, without losing what is being written", async () => {
    const { files, session, type } = setup();
    await openScene(session, "/bok", "01J9Z4K2QX");
    type("Brevet låg kvar.\n");

    await renameScene(session, "/bok", "01J9Z4K2QX", "Köksbordet");

    expect(await files.readText(SCENE_PATH)).toBe(
      "---\nid: 01J9Z4K2QX\ntitle: Köksbordet\n---\nBrevet låg kvar.\n",
    );
    expect(session.scene?.title).toBe("Köksbordet");
  });

  it("renames a scene that is not open by rewriting its front matter", async () => {
    const { files, session } = setup();

    await renameScene(session, "/bok", "01J9Z4K2QX", "Köksbordet");

    expect(await files.readText(SCENE_PATH)).toBe(
      "---\nid: 01J9Z4K2QX\ntitle: Köksbordet\n---\nBrevet låg där.\n",
    );
  });
});

describe("closeScene", () => {
  it("saves what is written and leaves no scene open", async () => {
    const { files, session, type } = setup();
    await openScene(session, "/bok", "01J9Z4K2QX");
    type("Brevet låg kvar.\n");

    const closed = await closeScene(session);

    expect(closed).toBe(true);
    expect(session.scene).toBeNull();
    expect(await files.readText(SCENE_PATH)).toContain("Brevet låg kvar.");
  });

  it("writes nothing after the scene is closed", async () => {
    const { files, session, type } = setup();
    await openScene(session, "/bok", "01J9Z4K2QX");
    await closeScene(session);

    type("Text utan scen.\n");
    await vi.advanceTimersByTimeAsync(2000);

    expect(await files.readText(SCENE_PATH)).toBe(SCENE);
  });
});
