import { appendDoc, cutAfter, textAfter } from "../editor/sceneSplit.js";
import type { useEditorView } from "../editor/useEditorView.js";
import { parseMarkdown } from "../manuscript/parseMarkdown.js";
import { sceneStatus, splitSceneFile } from "../manuscript/sceneFile.js";
import { insertAfter, moveToTrash, nextSceneSibling, type TreeNode } from "../project/tree.js";
import { joinPath } from "../storage/fileSystem.js";
import { platform } from "./platform.js";
import { createScene, setSceneStatus, type SceneSession } from "./sceneSession.js";
import type { Project } from "./useProject.js";
import { t } from "../i18n/i18n.js";

interface SplitInput {
  project: Project | null;
  session: SceneSession;
  editor: ReturnType<typeof useEditorView>;
  updateTree: (tree: TreeNode[]) => Promise<void>;
  refresh: () => Promise<void>;
}

// A note from the series cannot be split or merged.
function openBookScene({ project, session }: SplitInput) {
  const scene = session.scene;
  if (!project || project.isReadOnly || !scene || scene.dir !== project.dir) return null;
  return { project, scene };
}

async function split(input: SplitInput) {
  const open = openBookScene(input);
  const state = input.editor.viewRef.current?.state;
  if (!open || !state) return;
  const { project, scene } = open;
  const pos = state.selection.from;
  if (pos <= 1 || pos >= state.doc.content.size - 1) return;
  const title = t("{title}, fortsättning", { title: scene.title });
  const id = await createScene(platform.fileSystem, project.dir, title, textAfter(state.doc, pos));
  await setSceneStatus(input.session, project.dir, id, sceneStatus(scene.frontMatter));
  input.editor.run(cutAfter(pos));
  await input.session.autosave.flush();
  await input.updateTree(insertAfter(project.tree, { id, kind: "scene" }, scene.id));
  await input.refresh();
}

async function merge(input: SplitInput) {
  const open = openBookScene(input);
  const nextId = open ? nextSceneSibling(open.project.tree, open.scene.id) : null;
  if (!open || !nextId) return;
  const path = joinPath(open.project.dir, `scenes/${nextId}.md`);
  const text = await platform.fileSystem.readText(path).catch(() => null);
  if (text === null) return;
  input.editor.run(appendDoc(parseMarkdown(splitSceneFile(text).body)));
  await input.session.autosave.flush();
  await input.updateTree(moveToTrash(open.project.tree, nextId));
  await input.refresh();
}

export function sceneSplitActions(input: SplitInput) {
  const open = openBookScene(input);
  return {
    split: () => void split(input),
    merge: () => void merge(input),
    canMerge: open !== null && nextSceneSibling(open.project.tree, open.scene.id) !== null,
  };
}
