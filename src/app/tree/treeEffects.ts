import { useEffect, useRef } from "react";
import { ancestorIds, findNode, type TreeNode } from "../../project/tree.js";
import type { TreeViewProps, View } from "./useTreeView.js";

// What the tree does by itself: shows a node just made, and the scene just opened.

export function useRenameRequest(props: TreeViewProps, view: View) {
  const { renameRequestId, project } = props;
  const { expand, setRenamingId } = view;
  const handledId = useRef<string | null>(null);
  useEffect(() => {
    if (!renameRequestId || handledId.current === renameRequestId) return;
    // The tree may not hold the new node yet; the effect runs again when it does.
    if (!findNode(project.tree, renameRequestId)) return;
    handledId.current = renameRequestId;
    expand(ancestorIds(project.tree, renameRequestId));
    setRenamingId(renameRequestId);
  }, [renameRequestId, project.tree, expand, setRenamingId]);
}

/** Unfolds the tree to the scene and scrolls its row into sight. */
function showInTree(tree: TreeNode[], sceneId: string, expand: View["expand"]) {
  expand(ancestorIds(tree, sceneId));
  requestAnimationFrame(() =>
    document
      .querySelectorAll(".tree-row.active")
      .forEach((row) => row.scrollIntoView({ block: "nearest" })),
  );
}

// While following, wherever a scene was opened from, the tree unfolds to it and shows it.
export function useFollowOpenScene(props: TreeViewProps, view: View) {
  const { openSceneId, project, isFollowingOpenScene = true } = props;
  const { expand } = view;
  const treeRef = useRef(project.tree);
  treeRef.current = project.tree;
  useEffect(() => {
    if (openSceneId && isFollowingOpenScene) showInTree(treeRef.current, openSceneId, expand);
  }, [openSceneId, expand, isFollowingOpenScene]);
}
