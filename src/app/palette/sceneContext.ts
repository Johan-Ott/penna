import type { Command } from "prosemirror-state";
import { insertPicture } from "../../editor/pictureView.js";
import { chapterOf } from "../../project/treeLabels.js";
import type { TreeNode } from "../../project/tree.js";
import { recordFailure } from "../errorLog.js";
import { choosePicture } from "../pictureFiles.js";
import type { PaletteContext } from "./paletteEntries.js";
import type { AppState } from "../App.js";
import { speechContext } from "../ReadAloud.js";

type SceneParts = {
  scene: { id: string } | null;
  project: { dir: string; tree: TreeNode[]; fields: Record<string, unknown> };
  editor: AppState["editor"];
  snapshots: { show: (id: string) => void };
  drafts: { show: (chapterId: string | null) => void };
  sceneSplit: { split: () => void; merge: () => void; canMerge: boolean };
  writingMode: { read: PaletteContext["read"] };
  suggesting: { isSuggesting: boolean; start: () => void; stop: () => void };
};

// The picture is copied into the book first, then placed where the cursor is.
export async function insertChosenPicture(dir: string, run: (command: Command) => void) {
  const name = await choosePicture(dir).catch(recordFailure("Bild"));
  if (name) run(insertPicture(name));
}

const suggestToggle = ({ scene, suggesting }: SceneParts) =>
  scene ? () => (suggesting.isSuggesting ? suggesting.stop() : suggesting.start()) : null;

/** The commands that work on the open text; null where no text is open. */
export function sceneContext(app: SceneParts) {
  const { scene, project } = app;
  return {
    showSnapshots: scene ? () => app.snapshots.show(scene.id) : null,
    showDrafts: () =>
      app.drafts.show(scene ? (chapterOf(project.tree, scene.id)?.id ?? null) : null),
    splitScene: scene ? app.sceneSplit.split : null,
    mergeScene: app.sceneSplit.canMerge ? app.sceneSplit.merge : null,
    read: app.writingMode.read,
    openChapterId: scene ? (chapterOf(project.tree, scene.id)?.id ?? null) : null,
    insertPicture: scene ? () => void insertChosenPicture(project.dir, app.editor.run) : null,
    ...speechContext(app, project),
    toggleSuggesting: suggestToggle(app),
  };
}
