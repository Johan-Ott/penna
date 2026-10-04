export type NodeKind = "part" | "chapter" | "scene" | "folder";

/** A scene node has no title: the scene's title lives in its own file's front matter. */
export interface TreeNode {
  id: string;
  kind: NodeKind;
  title?: string;
  children?: TreeNode[];
}

export const CHARACTERS_ID = "karaktarer";
export const PLACES_ID = "platser";
export const TIMELINE_ID = "tidslinje";
export const NOTES_ID = "anteckningar";
export const RESEARCH_ID = "research";
export const TRASH_ID = "trash";

// Characters, places, the timeline's events and notes are ordinary scene files kept in folders of
// their own, beside the manuscript, so they are written, moved and thrown away like any scene.
const SPECIAL_FOLDERS: TreeNode[] = [
  { id: CHARACTERS_ID, kind: "folder", title: "Karaktärer" },
  { id: PLACES_ID, kind: "folder", title: "Platser" },
  { id: TIMELINE_ID, kind: "folder", title: "Tidslinje" },
  { id: NOTES_ID, kind: "folder", title: "Anteckningar" },
  { id: RESEARCH_ID, kind: "folder", title: "Research" },
  { id: TRASH_ID, kind: "folder", title: "Papperskorg" },
];

const isSpecial = (id: string) => SPECIAL_FOLDERS.some((folder) => folder.id === id);

const ALLOWED_CHILDREN: Record<NodeKind | "root", NodeKind[]> = {
  root: ["part", "chapter", "scene", "folder"],
  part: ["chapter", "scene"],
  chapter: ["scene"],
  folder: ["part", "chapter", "scene", "folder"],
  scene: [],
};

/** The manuscript first, then Karaktärer, Platser, Research and Papperskorg, which always exist. */
export function withSpecialFolders(tree: TreeNode[]): TreeNode[] {
  const ordinary = tree.filter((node) => !isSpecial(node.id));
  const special = SPECIAL_FOLDERS.map(
    (folder) => tree.find((node) => node.id === folder.id) ?? { ...folder, children: [] },
  );
  return [...ordinary, ...special];
}

export interface FoundNode {
  node: TreeNode;
  parent: TreeNode | null;
  index: number;
}

export function findNode(
  tree: TreeNode[],
  id: string,
  parent: TreeNode | null = null,
): FoundNode | null {
  for (const [index, node] of tree.entries()) {
    if (node.id === id) return { node, parent, index };
    const found = node.children ? findNode(node.children, id, node) : null;
    if (found) return found;
  }
  return null;
}

function removeNode(tree: TreeNode[], id: string): TreeNode[] {
  return tree
    .filter((node) => node.id !== id)
    .map((node) => (node.children ? { ...node, children: removeNode(node.children, id) } : node));
}

const insertAt = (list: TreeNode[], node: TreeNode, index: number) => [
  ...list.slice(0, index),
  node,
  ...list.slice(index),
];

function insertInto(tree: TreeNode[], node: TreeNode, parentId: string, index: number): TreeNode[] {
  return tree.map((candidate) => {
    if (candidate.id === parentId) {
      return { ...candidate, children: insertAt(candidate.children ?? [], node, index) };
    }
    if (!candidate.children) return candidate;
    return { ...candidate, children: insertInto(candidate.children, node, parentId, index) };
  });
}

/** Inserts at `index` among the parent's children; at the root, always before the special folders. */
export function insertNode(
  tree: TreeNode[],
  node: TreeNode,
  parentId: string | null,
  index: number,
): TreeNode[] {
  if (parentId !== null) {
    const parent = findNode(tree, parentId)?.node;
    const canHold = !parent || ALLOWED_CHILDREN[parent.kind].includes(node.kind);
    return canHold ? insertInto(tree, node, parentId, index) : insertAfter(tree, node, parentId);
  }
  const ordinaryCount = tree.filter((candidate) => !isSpecial(candidate.id)).length;
  return insertAt(tree, node, Math.min(index, ordinaryCount));
}

/**
 * Moves a node to `index` among the new parent's children, counted after the node is taken out.
 * An impossible move returns the same tree.
 */
export function moveNode(tree: TreeNode[], id: string, parentId: string | null, index: number) {
  const found = findNode(tree, id);
  if (!found || !canMoveInto(tree, found.node, parentId)) return tree;
  return insertNode(removeNode(tree, id), found.node, parentId, index);
}

function canMoveInto(tree: TreeNode[], node: TreeNode, parentId: string | null): boolean {
  if (isSpecial(node.id)) return false;
  const targetKind = parentId === null ? "root" : findNode(tree, parentId)?.node.kind;
  if (!targetKind || !ALLOWED_CHILDREN[targetKind].includes(node.kind)) return false;
  const isOwnDescendant = parentId !== null && findNode([node], parentId) !== null;
  return !isOwnDescendant;
}

export const moveToTrash = (tree: TreeNode[], id: string) =>
  moveNode(tree, id, TRASH_ID, Number.MAX_SAFE_INTEGER);

export function renameNode(tree: TreeNode[], id: string, title: string): TreeNode[] {
  return tree.map((node) => {
    if (node.id === id) return { ...node, title };
    return node.children ? { ...node, children: renameNode(node.children, id, title) } : node;
  });
}

function collect(nodes: TreeNode[], wanted: NodeKind): TreeNode[] {
  return nodes.flatMap((node) => [
    ...(node.kind === wanted ? [node] : []),
    ...collect(node.children ?? [], wanted),
  ]);
}

const manuscript = (tree: TreeNode[]) => tree.filter((node) => !isSpecial(node.id));

/** Nodes of one kind in the manuscript, in reading order; Research and Papperskorg left out. */
export const manuscriptNodes = (tree: TreeNode[], kind: NodeKind) =>
  collect(manuscript(tree), kind);

/** The scenes kept in one folder and its subfolders, such as all the cards in Karaktärer. */
export const sceneIdsIn = (tree: TreeNode[], folderId: string) =>
  collect(findNode(tree, folderId)?.node.children ?? [], "scene").map((node) => node.id);

export const manuscriptSceneIds = (tree: TreeNode[]) =>
  manuscriptNodes(tree, "scene").map((node) => node.id);

/** Scene files the tree does not know go to the end of the manuscript; none are removed. */
export function reconcileScenes(tree: TreeNode[], sceneIdsOnDisk: string[]) {
  const known = collect(tree, "scene").map((node) => node.id);
  const unknown = sceneIdsOnDisk.filter((id) => !known.includes(id));
  const withUnknown = unknown.reduce(
    (result, id) => insertNode(result, { id, kind: "scene" }, null, Number.MAX_SAFE_INTEGER),
    withSpecialFolders(tree),
  );
  const missing = known.filter((id) => !sceneIdsOnDisk.includes(id));
  return { tree: withUnknown, missing };
}

/** A tree from scene files alone, in creation order (scene ids are ULIDs). */
export const rebuildTree = (sceneIds: string[]) =>
  withSpecialFolders([...sceneIds].sort().map((id): TreeNode => ({ id, kind: "scene" })));

/**
 * Inserts right after `siblingId`, or at the end of the manuscript when there is no sibling.
 * A node that may not sit next to the sibling goes after the nearest parent where it may.
 */
export function insertAfter(
  tree: TreeNode[],
  node: TreeNode,
  siblingId: string | null,
): TreeNode[] {
  let sibling = siblingId === null ? null : findNode(tree, siblingId);
  if (!sibling) return insertNode(tree, node, null, Number.MAX_SAFE_INTEGER);
  while (sibling.parent && !ALLOWED_CHILDREN[sibling.parent.kind].includes(node.kind)) {
    const above: FoundNode | null = findNode(tree, sibling.parent.id);
    if (!above) break;
    sibling = above;
  }
  return insertNode(tree, node, sibling.parent?.id ?? null, sibling.index + 1);
}

/** Numbers through the whole manuscript, as a reader would count parts or chapters. */
export function numberNodes(tree: TreeNode[], kind: "part" | "chapter"): Map<string, number> {
  return new Map(collect(manuscript(tree), kind).map((node, index) => [node.id, index + 1]));
}

export function isInTrash(tree: TreeNode[], id: string): boolean {
  const trash = tree.find((node) => node.id === TRASH_ID);
  return Boolean(trash?.children && findNode(trash.children, id));
}

export const isSpecialFolder = isSpecial;

function pathTo(tree: TreeNode[], id: string): string[] | null {
  for (const node of tree) {
    if (node.id === id) return [];
    const below = node.children ? pathTo(node.children, id) : null;
    if (below) return [node.id, ...below];
  }
  return null;
}

/** The ids of every node above `id`, from the root down; empty when `id` is not in the tree. */
export const ancestorIds = (tree: TreeNode[], id: string) => pathTo(tree, id) ?? [];
