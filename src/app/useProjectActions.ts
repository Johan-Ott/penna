import { useCallback, useState } from "react";
import {
  CHARACTERS_ID,
  insertAfter,
  insertNode,
  PLACES_ID,
  type NodeKind,
  type TreeNode,
} from "../project/tree.js";
import { chapterOf } from "../project/treeLabels.js";
import { newSceneId } from "../storage/sceneId.js";
import { platform } from "./platform.js";
import type { SceneStatus } from "../manuscript/sceneFile.js";
import {
  createScene,
  openScene,
  renameScene,
  setSceneStatus,
  type SceneSession,
} from "./sceneSession.js";
import type { Placement } from "./tree/treeMenus.js";
import type { Project } from "./useProject.js";

interface ProjectActionsInput {
  project: Project | null;
  session: SceneSession;
  updateTree: (tree: TreeNode[]) => Promise<void>;
  refresh: () => Promise<void>;
}

const NEW_TITLES: Record<NodeKind, string> = {
  scene: "Ny scen",
  chapter: "Nytt kapitel",
  part: "Ny del",
  folder: "Ny mapp",
};

// A scene made in Karaktärer or Platser is a card, and is named like one.
function newSceneTitle(placement: Placement) {
  if (placement && "inside" in placement && placement.inside === CHARACTERS_ID)
    return "Ny karaktär";
  if (placement && "inside" in placement && placement.inside === PLACES_ID) return "Ny plats";
  return NEW_TITLES.scene;
}

// Without a placement, a scene goes after the open scene and a chapter after the chapter
// being written in; parts and folders go last in the manuscript.
function defaultPlacement(tree: TreeNode[], kind: NodeKind, openSceneId: string | null) {
  if (!openSceneId || kind === "part" || kind === "folder") return null;
  if (kind === "scene") return openSceneId;
  return chapterOf(tree, openSceneId)?.id ?? null;
}

function place(tree: TreeNode[], node: TreeNode, placement: Placement, openSceneId: string | null) {
  if (placement && "inside" in placement) {
    return insertNode(tree, node, placement.inside, Number.MAX_SAFE_INTEGER);
  }
  const afterId = placement ? placement.after : defaultPlacement(tree, node.kind, openSceneId);
  return insertAfter(tree, node, afterId);
}

// Title and status live in each scene file; after a change the tree reads them again.
function useSceneFileActions({
  project,
  session,
  refresh,
}: Omit<ProjectActionsInput, "updateTree">) {
  const renameSceneTitle = useCallback(
    async (id: string, title: string) => {
      if (!project) return;
      await renameScene(session, project.dir, id, title);
      await refresh();
    },
    [project, session, refresh],
  );
  const setStatus = useCallback(
    async (id: string, status: SceneStatus) => {
      if (!project) return;
      await setSceneStatus(session, project.dir, id, status);
      await refresh();
    },
    [project, session, refresh],
  );
  return { renameSceneTitle, setStatus };
}

/** Creating and renaming things in the project: scene files and the tree in project.json. */
export function useProjectActions({ project, session, updateTree, refresh }: ProjectActionsInput) {
  // Returns the new node's id, so the tree can start renaming it.
  const newItem = useCallback(
    async (kind: NodeKind, placement: Placement = null) => {
      if (!project) return null;
      const isScene = kind === "scene";
      const id = isScene
        ? await createScene(platform.fileSystem, project.dir, newSceneTitle(placement))
        : newSceneId();
      const node: TreeNode = isScene
        ? { id, kind }
        : { id, kind, title: NEW_TITLES[kind], children: [] };
      await updateTree(place(project.tree, node, placement, session.scene?.id ?? null));
      if (isScene) await refresh().then(() => openScene(session, project.dir, id));
      return id;
    },
    [project, session, updateTree, refresh],
  );
  return { newItem, ...useSceneFileActions({ project, session, refresh }) };
}

// New chapters, parts and folders start with their name ready to type; scenes open in the editor.
export function useTreeHandlers(actions: ReturnType<typeof useProjectActions>) {
  const [renameRequestId, setRenameRequestId] = useState<string | null>(null);
  return {
    renameRequestId,
    onRenameScene: (id: string, title: string) => void actions.renameSceneTitle(id, title),
    onSetSceneStatus: (id: string, status: SceneStatus) => void actions.setStatus(id, status),
    onAdd: (kind: NodeKind, placement: Placement) =>
      void actions.newItem(kind, placement).then((id) => {
        if (id && kind !== "scene") setRenameRequestId(id);
      }),
  };
}
