import { useState, type DragEvent } from "react";
import type { TreeNode } from "../../project/tree.js";
import { dropMove, type DropPosition, type TreeRow } from "../../project/treeRows.js";

interface DropTarget {
  id: string;
  position: DropPosition;
}

// The top and bottom quarter of a row drop before or after it; the middle drops inside it.
function positionInRow(event: DragEvent<HTMLElement>, node: TreeNode): DropPosition {
  const box = event.currentTarget.getBoundingClientRect();
  const offset = (event.clientY - box.top) / box.height;
  if (node.kind !== "scene" && offset > 0.25 && offset < 0.75) return "inside";
  return offset < 0.5 ? "before" : "after";
}

/** A drop only changes the tree, never a scene file. */
export function useTreeDrag(tree: TreeNode[], onChangeTree: (tree: TreeNode[]) => void) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const reset = () => {
    setDraggedId(null);
    setDropTarget(null);
  };
  const rowDragProps = (row: TreeRow, isDraggable: boolean) => ({
    draggable: isDraggable,
    onDragStart: (event: DragEvent<HTMLElement>) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", row.node.id);
      setDraggedId(row.node.id);
    },
    onDragOver: (event: DragEvent<HTMLElement>) => {
      if (!draggedId || draggedId === row.node.id) return;
      event.preventDefault();
      setDropTarget({ id: row.node.id, position: positionInRow(event, row.node) });
    },
    onDrop: (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      if (draggedId && dropTarget)
        onChangeTree(dropMove(tree, draggedId, row, dropTarget.position));
      reset();
    },
    onDragEnd: reset,
  });
  const dropHintFor = (id: string) => (dropTarget?.id === id ? dropTarget.position : null);
  return { rowDragProps, dropHintFor, draggedId };
}
