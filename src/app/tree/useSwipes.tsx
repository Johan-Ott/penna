import { useEffect, useState } from "react";
import { SCENE_STATUSES } from "../../manuscript/sceneFile.js";
import type { TreeNode } from "../../project/tree.js";
import type { TreeRow as Row } from "../../project/treeRows.js";
import { nodeLabel } from "../../project/treeLabels.js";
import { rowView, type Tree, type TreeViewProps } from "./useTreeView.js";
import { t } from "../../i18n/i18n.js";

// A finger is the only pointer, as on a phone or a tablet; a mouse drags rows instead.
const isTouch = () => matchMedia("(pointer: coarse)").matches;

function nextStatusOf(row: Row, props: TreeViewProps, tree: Tree) {
  const status = rowView(row, props, tree.view.collapsed).status?.id;
  if (!status) return null;
  return SCENE_STATUSES[(SCENE_STATUSES.indexOf(status) + 1) % SCENE_STATUSES.length] ?? null;
}

function swipesFor(
  row: Row,
  props: TreeViewProps,
  tree: Tree,
  onTrashed: (node: TreeNode) => void,
) {
  const { actions } = tree;
  if (!isTouch() || actions.isInTrash(row.node.id) || !actions.canEdit(row.node)) return {};
  const next = nextStatusOf(row, props, tree);
  return {
    onSwipeLeft: () => (actions.trash(row.node), onTrashed(row.node)),
    onSwipeRight: next ? () => props.onSetSceneStatus(row.node.id, next) : undefined,
  };
}

const UNDO_MS = 5000;

// On a phone a row swipes: left to the trash, with a moment to take it back, and right to the
// scene's next status.
export function useSwipes(props: TreeViewProps, tree: Tree) {
  const [trashed, setTrashed] = useState<TreeNode | null>(null);
  useEffect(() => {
    if (!trashed) return;
    const timer = setTimeout(() => setTrashed(null), UNDO_MS);
    return () => clearTimeout(timer);
  }, [trashed]);
  const swipesOf = (row: Row) => swipesFor(row, props, tree, setTrashed);
  const { actions } = tree;
  const undo = trashed && (
    <div className="toast inverted tree-undo" role="status">
      <span>
        {t("{title} ligger i papperskorgen.", {
          title: nodeLabel(trashed, props.project.tree, props.project.summaries),
        })}
      </span>
      <button className="link-button" onClick={() => (actions.restore(trashed), setTrashed(null))}>
        {t("Ångra")}
      </button>
    </div>
  );
  return { swipesOf, undo };
}
