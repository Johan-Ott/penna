import { findNode, moveNode, TRASH_ID, type FoundNode, type TreeNode } from "./tree.js";

export interface TreeRow {
  node: TreeNode;
  depth: number;
  parentId: string | null;
  index: number;
}

/** The rows a reader sees, top to bottom; the inside of a collapsed node is left out. */
export function visibleRows(
  tree: TreeNode[],
  collapsed: ReadonlySet<string>,
  depth = 0,
  parentId: string | null = null,
): TreeRow[] {
  return tree.flatMap((node, index) => [
    { node, depth, parentId, index },
    ...(collapsed.has(node.id)
      ? []
      : visibleRows(node.children ?? [], collapsed, depth + 1, node.id)),
  ]);
}

export type DropPosition = "before" | "after" | "inside";

/** Turns a drop on a row into a move. Indexes count after the dragged node is taken out. */
export function dropMove(
  tree: TreeNode[],
  draggedId: string,
  row: TreeRow,
  position: DropPosition,
) {
  const dragged = findNode(tree, draggedId);
  if (!dragged) return tree;
  if (position === "inside") return dropInside(tree, dragged, row);
  const isSameParent = (dragged.parent?.id ?? null) === row.parentId;
  const shift = isSameParent && dragged.index < row.index ? 1 : 0;
  const index = row.index + (position === "after" ? 1 : 0) - shift;
  return moveNode(tree, draggedId, row.parentId, index);
}

function dropInside(tree: TreeNode[], dragged: FoundNode, row: TreeRow) {
  const childCount = row.node.children?.length ?? 0;
  const isAlreadyInside = dragged.parent?.id === row.node.id;
  return moveNode(tree, dragged.node.id, row.node.id, childCount - (isAlreadyInside ? 1 : 0));
}

/** The sidebar's three parts: the book, the notes in their sorts, and Papperskorg last. */
export function sidebarSections(rows: TreeRow[]) {
  const sections = { book: [] as TreeRow[], notes: [] as TreeRow[], trash: [] as TreeRow[] };
  let section = sections.book;
  for (const row of rows) {
    if (row.depth === 0) {
      if (row.node.kind === "sort") section = sections.notes;
      else if (row.node.id === TRASH_ID) section = sections.trash;
      else section = sections.book;
    }
    section.push(row);
  }
  return sections;
}
