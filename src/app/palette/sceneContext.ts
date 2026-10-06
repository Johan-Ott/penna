import type { Command } from "prosemirror-state";
import { insertPicture } from "../../editor/pictureView.js";
import { chapterOf } from "../../project/treeLabels.js";
import type { TreeNode } from "../../project/tree.js";
import { recordFailure } from "../errorLog.js";
import { choosePicture } from "../pictureFiles.js";
import type { PaletteContext } from "./paletteEntries.js";

type SceneParts = {
  scene: { id: string } | null;
  project: { dir: string; tree: TreeNode[] };
  editor: { run: (command: Command) => void };
  snapshots: { show: (id: string) => void };
  sceneSplit: { split: () => void; merge: () => void; canMerge: boolean };
  writingMode: { read: PaletteContext["read"] };
};

// The picture is copied into the book first, then placed where the cursor is.
export async function insertChosenPicture(dir: string, run: (command: Command) => void) {
  const name = await choosePicture(dir).catch(recordFailure("Bild"));
  if (name) run(insertPicture(name));
}

/** The commands that work on the open text; null where no text is open. */
export function sceneContext(app: SceneParts) {
  const { scene, project } = app;
  return {
    showSnapshots: scene ? () => app.snapshots.show(scene.id) : null,
    splitScene: scene ? app.sceneSplit.split : null,
    mergeScene: app.sceneSplit.canMerge ? app.sceneSplit.merge : null,
    read: app.writingMode.read,
    openChapterId: scene ? (chapterOf(project.tree, scene.id)?.id ?? null) : null,
    insertPicture: scene ? () => void insertChosenPicture(project.dir, app.editor.run) : null,
  };
}
