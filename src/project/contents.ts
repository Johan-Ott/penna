import { SCENE_STATUSES, type SceneStatus } from "../manuscript/sceneFile.js";
import type { SceneSummary } from "./sceneSummaries.js";
import { numberNodes, TRASH_ID, type TreeNode } from "./tree.js";

type Summaries = Record<string, SceneSummary>;

/** A chapter, or a scene outside any chapter. */
export interface ContentsRow {
  id: string;
  /** Null for a scene outside a chapter. */
  number: number | null;
  title: string;
  summary: string;
  when: string;
  pov: string;
  words: number;
  status: SceneStatus;
  sceneIds: string[];
}

const scenesIn = (node: TreeNode): string[] =>
  node.kind === "scene" ? [node.id] : (node.children ?? []).flatMap(scenesIn);

/** A chapter is only as far along as its least finished scene. */
export function leastFinished(statuses: SceneStatus[]): SceneStatus {
  const ranks = statuses.map((status) => SCENE_STATUSES.indexOf(status));
  return SCENE_STATUSES[Math.min(...ranks)] ?? "idé";
}

function rowOf(node: TreeNode, number: number | null, summaries: Summaries): ContentsRow {
  const sceneIds = scenesIn(node);
  const title = node.kind === "scene" ? (summaries[node.id]?.title ?? "") : (node.title ?? "");
  return {
    id: node.id,
    number,
    title,
    summary: node.summary ?? "",
    when: node.when ?? "",
    pov: node.pov ?? "",
    words: sceneIds.reduce((sum, id) => sum + (summaries[id]?.words ?? 0), 0),
    status: leastFinished(sceneIds.map((id) => summaries[id]?.status ?? "idé")),
    sceneIds,
  };
}

// Parts and folders only group, so they are walked through.
function walk(nodes: TreeNode[], numbers: Map<string, number>, summaries: Summaries) {
  return nodes.flatMap((node): ContentsRow[] => {
    if (node.kind === "chapter") return [rowOf(node, numbers.get(node.id) ?? null, summaries)];
    if (node.kind === "scene") return [rowOf(node, null, summaries)];
    return walk(node.children ?? [], numbers, summaries);
  });
}

export function contentsRows(tree: TreeNode[], summaries: Summaries): ContentsRow[] {
  const book = tree.filter((node) => node.kind !== "sort" && node.id !== TRASH_ID);
  return walk(book, numberNodes(tree, "chapter"), summaries);
}

const byWhen = (first: ContentsRow, second: ContentsRow) =>
  !first.when || !second.when
    ? Number(!first.when) - Number(!second.when)
    : first.when.localeCompare(second.when, undefined, { numeric: true, sensitivity: "base" });

/** By När until a row is dragged, then as dragged; rows without När, or new ones, keep reading order. */
export function inTimeOrder(rows: ContentsRow[], order: string[]): ContentsRow[] {
  if (order.length === 0) return [...rows].sort(byWhen);
  const rank = (row: ContentsRow) => {
    const index = order.indexOf(row.id);
    return index === -1 ? order.length + rows.indexOf(row) : index;
  };
  return [...rows].sort((first, second) => rank(first) - rank(second));
}

export function movedInTime(shown: ContentsRow[], id: string, index: number): string[] {
  const ids = shown.map((row) => row.id).filter((rowId) => rowId !== id);
  return [...ids.slice(0, index), id, ...ids.slice(index)];
}

type NodeFields = {
  [Key in Exclude<keyof TreeNode, "id" | "kind" | "children">]?: TreeNode[Key] | undefined;
};

const withFields = (node: TreeNode, fields: NodeFields) =>
  Object.fromEntries(
    Object.entries({ ...node, ...fields }).filter(([, value]) => value !== undefined),
  ) as unknown as TreeNode;

/** An undefined field is removed from the node. */
export function withNodeFields(tree: TreeNode[], id: string, fields: NodeFields): TreeNode[] {
  return tree.map((node) => {
    if (node.id === id) return withFields(node, fields);
    return node.children ? { ...node, children: withNodeFields(node.children, id, fields) } : node;
  });
}

export const withNodeText = (
  tree: TreeNode[],
  id: string,
  field: "summary" | "when" | "pov",
  text: string,
) => withNodeFields(tree, id, { [field]: text });
