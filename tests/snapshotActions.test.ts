import type { Node } from "prosemirror-model";
import { describe, expect, it } from "vitest";
import { restoreSnapshot } from "../src/app/snapshotActions";
import { createSceneSession, openScene, sceneEdited } from "../src/app/sceneSession";
import { parseMarkdown } from "../src/manuscript/parseMarkdown";
import { listSnapshots, takeSnapshot } from "../src/project/snapshots";
import { createMemoryFileSystem } from "../src/storage/memoryFileSystem";

const SCENE_ID = "01J9Z4K2QX";
const PATH = `/bok/scenes/${SCENE_ID}.md`;
const NOW = `---\nid: ${SCENE_ID}\ntitle: Köket\nstatus: redigering\n---\nIsen var grå och orörlig.\n`;
const OLD = `---\nid: ${SCENE_ID}\ntitle: Kök\nstatus: utkast\n---\nIsen var tung och grå.\n`;
const BOOK = { dir: "/bok", id: SCENE_ID };
const TIME = new Date(2026, 9, 2, 14, 3).getTime();

describe("restoreSnapshot", () => {
  it("first snapshots what is there now, then puts the old text back under today's title", async () => {
    const files = createMemoryFileSystem({ [PATH]: NOW });
    let editorDoc: Node | null = null;
    const session = createSceneSession(files, {
      editor: { load: (doc) => (editorDoc = doc), currentDoc: () => editorDoc },
      onScene: () => undefined,
      onConflict: () => undefined,
      onSaveStatus: () => undefined,
    });
    await takeSnapshot(files, BOOK, OLD, { time: TIME - 60_000 });
    await openScene(session, "/bok", SCENE_ID);
    editorDoc = parseMarkdown("Isen var grå och orörlig. Osparat.\n");
    sceneEdited(session, editorDoc);
    const old = (await listSnapshots(files, BOOK))[0];

    if (old) await restoreSnapshot(session, BOOK, old, TIME);

    const snapshots = await listSnapshots(files, BOOK);
    expect(await files.readText(PATH)).toBe(
      `---\nid: ${SCENE_ID}\ntitle: Köket\nstatus: redigering\n---\nIsen var tung och grå.\n`,
    );
    expect(snapshots[0]?.label).toBe("Före återställning");
    expect(snapshots[0]?.body).toBe("Isen var grå och orörlig. Osparat.\n");
    expect(editorDoc?.textContent).toBe("Isen var tung och grå.");
  });
});
