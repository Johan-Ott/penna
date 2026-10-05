import { useCallback } from "react";
import { isLinkedByDefault } from "../../project/cards.js";
import { insertNode, type TreeNode } from "../../project/tree.js";
import { newSceneId } from "../../storage/sceneId.js";
import { platform } from "../platform.js";
import { createScene, openScene, setNoteLink, type SceneSession } from "../sceneSession.js";
import type { Project } from "../useProject.js";

export interface NewNote {
  name: string;
  sortId: string | null;
  newSortTitle: string | null;
  isLinked: boolean;
}

interface NoteActionsInput {
  project: Project | null;
  session: SceneSession;
  updateTree: (tree: TreeNode[]) => Promise<void>;
  refresh: () => Promise<void>;
}

function withSort(tree: TreeNode[], note: NewNote) {
  if (!note.newSortTitle) return { tree, sortId: note.sortId ?? "" };
  const sort: TreeNode = { id: newSceneId(), kind: "sort", title: note.newSortTitle, children: [] };
  return { tree: insertNode(tree, sort, null, 0), sortId: sort.id };
}

/** Only a link choice that differs from the sort's is written to the note. */
export function useNoteActions({ project, session, updateTree, refresh }: NoteActionsInput) {
  const newNote = useCallback(
    async (note: NewNote) => {
      if (!project || project.isReadOnly) return;
      const { tree, sortId } = withSort(project.tree, note);
      const id = await createScene(platform.fileSystem, project.dir, note.name);
      if (note.isLinked !== isLinkedByDefault(sortId)) {
        await setNoteLink(session, project.dir, id, note.isLinked);
      }
      await updateTree(insertNode(tree, { id, kind: "scene" }, sortId, Number.MAX_SAFE_INTEGER));
      await refresh();
      await openScene(session, project.dir, id);
    },
    [project, session, updateTree, refresh],
  );
  const setLink = useCallback(
    async (id: string, isLinked: boolean) => {
      if (!project) return;
      await setNoteLink(session, project.dir, id, isLinked);
      await refresh();
    },
    [project, session, refresh],
  );
  return { newNote, setLink };
}
