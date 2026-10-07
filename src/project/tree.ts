/** A sort holds notes of one kind, such as Personer; the writer can add sorts of their own. */
export type NodeKind = "part" | "chapter" | "scene" | "folder" | "sort";

/** A scene node has no title: it lives in the scene file's front matter. */
export interface TreeNode {
  id: string;
  kind: NodeKind;
  title?: string;
  summary?: string;
  when?: string;
  /** Printed under a chapter's title, such as whose point of view it is. */
  subtitle?: string;
  /** A quotation printed before the chapter's text, and who said it. */
  epigraph?: string;
  epigraphBy?: string;
  /** The id of the chapter's opening template, when it is not the book's standard one. */
  opening?: string;
  /** The chapter's own picture in bilder/ for an area of its template, by the area's id. */
  pictures?: Record<string, string>;
  /** The ids of the book's own labels on it, from project.json's `labels`. */
  labels?: string[];
  children?: TreeNode[];
}

/** What a chapter prints around its title. */
export type ChapterHeading = Pick<TreeNode, "subtitle" | "epigraph" | "epigraphBy">;
export const HEADING_FIELDS = ["subtitle", "epigraph", "epigraphBy"] as const;

export const CHARACTERS_ID = "karaktarer";
export const PLACES_ID = "platser";
export const THINGS_ID = "saker";
/** Övrigt: notes whose names are not linked in the text unless the writer asks. */
export const NOTES_ID = "anteckningar";
export const TRASH_ID = "trash";

// Notes are scene files kept in sorts, so they are written, moved and trashed like any scene.
const FIXED_SORTS: { id: string; kind: "sort"; title: string }[] = [
  { id: CHARACTERS_ID, kind: "sort", title: "Personer" },
  { id: PLACES_ID, kind: "sort", title: "Platser" },
  { id: THINGS_ID, kind: "sort", title: "Saker" },
  { id: NOTES_ID, kind: "sort", title: "Övrigt" },
];
const TRASH: TreeNode = { id: TRASH_ID, kind: "folder", title: "Papperskorg" };

// Older projects had these as fixed folders; with texts in them they become sorts.
const RETIRED_FOLDERS = ["tidslinje", "research"];

const isSpecial = (id: string) => id === TRASH_ID || FIXED_SORTS.some((sort) => sort.id === id);
const isNoteSide = (node: TreeNode) =>
  node.kind === "sort" || node.id === TRASH_ID || RETIRED_FOLDERS.includes(node.id);

const ALLOWED_CHILDREN: Record<NodeKind | "root", NodeKind[]> = {
  root: ["part", "chapter", "scene", "folder", "sort"],
  part: ["chapter", "scene"],
  chapter: ["scene"],
  folder: ["part", "chapter", "scene", "folder", "sort"],
  sort: ["scene"],
  scene: [],
};

export function withSpecialFolders(tree: TreeNode[]): TreeNode[] {
  const ordinary = tree.filter((node) => !isNoteSide(node) && !isSpecial(node.id));
  const fixed = FIXED_SORTS.map((sort) => {
    const found = tree.find((node) => node.id === sort.id);
    return found
      ? { ...found, kind: "sort" as const, title: sort.title }
      : { ...sort, children: [] };
  });
  const own = tree
    .filter((node) => isNoteSide(node) && !isSpecial(node.id))
    .filter((node) => node.kind === "sort" || (node.children ?? []).length > 0)
    .map((node) => ({ ...node, kind: "sort" as const }));
  const trash = tree.find((node) => node.id === TRASH_ID) ?? { ...TRASH, children: [] };
  return [...ordinary, ...fixed, ...own, trash];
}

export const sortsOf = (tree: TreeNode[]) => tree.filter((node) => node.kind === "sort");

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

export function removeNode(tree: TreeNode[], id: string): TreeNode[] {
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

/** At the root, always before the special folders. */
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
  // Manuscript nodes go before the sorts; a sort always goes last, just before Papperskorg.
  if (node.kind === "sort") return insertAt(tree, node, tree.length - 1);
  const manuscriptEnd = tree.length - sortsOf(tree).length - 1;
  return insertAt(tree, node, Math.max(0, Math.min(index, manuscriptEnd)));
}

/** `index` is counted after the node is taken out. An impossible move returns the same tree. */
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

const manuscript = (tree: TreeNode[]) => tree.filter((node) => !isNoteSide(node));

/** Notes and Papperskorg left out. */
export const manuscriptNodes = (tree: TreeNode[], kind: NodeKind) =>
  collect(manuscript(tree), kind);

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

/** In creation order, as scene ids are ULIDs. */
export const rebuildTree = (sceneIds: string[]) =>
  withSpecialFolders([...sceneIds].sort().map((id): TreeNode => ({ id, kind: "scene" })));

/** At the end of the manuscript when there is no sibling. */
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

/** From the root down; empty when `id` is not in the tree. */
export const ancestorIds = (tree: TreeNode[], id: string) => pathTo(tree, id) ?? [];

export function nextSceneSibling(tree: TreeNode[], id: string): string | null {
  const found = findNode(tree, id);
  if (!found) return null;
  const siblings = found.parent ? (found.parent.children ?? []) : tree;
  const next = siblings[found.index + 1];
  return next?.kind === "scene" ? next.id : null;
}
