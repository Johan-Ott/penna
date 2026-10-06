import type { Node } from "prosemirror-model";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSceneSession,
  openScene,
  sceneEdited,
  writeOverScene,
} from "../src/app/sceneSession";
import { parseMarkdown } from "../src/manuscript/parseMarkdown";
import { createMemoryFileSystem } from "../src/storage/memoryFileSystem";

const SCENE_PATH = "/bok/scenes/01J9Z4K2QX.md";
const SCENE = "---\nid: 01J9Z4K2QX\ntitle: Köket\n---\nBrevet låg där.\n";

function setup() {
  const files = createMemoryFileSystem({ [SCENE_PATH]: SCENE });
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

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("a sync writing over the open scene", () => {
  it("saves what is typed first and shows the new text after", async () => {
    const { files, session, type, editorText } = setup();
    await openScene(session, "/bok", "01J9Z4K2QX");
    type("Brevet låg kvar.\n");
    let textBefore = "";

    await writeOverScene(session, SCENE_PATH, async () => {
      textBefore = await files.readText(SCENE_PATH);
      await files.writeText(SCENE_PATH, SCENE.replace("där", "på bordet"));
    });

    expect(textBefore).toContain("Brevet låg kvar.");
    expect(editorText()).toBe("Brevet låg på bordet.");
  });

  it("saves nothing over the file while it is written", async () => {
    const { files, session, type } = setup();
    await openScene(session, "/bok", "01J9Z4K2QX");

    await writeOverScene(session, SCENE_PATH, async () => {
      type("Skrivet under synken.\n");
      await vi.advanceTimersByTimeAsync(1000);
      expect(await files.readText(SCENE_PATH)).toBe(SCENE);
    });
  });
});
