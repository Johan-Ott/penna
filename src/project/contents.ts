import { SCENE_STATUSES, type SceneStatus } from "../manuscript/sceneFile.js";
import type { SceneSummary } from "./sceneSummaries.js";
import { numberNodes, TRASH_ID, type TreeNode } from "./tree.js";

type Summaries = Record<string, SceneSummary>;

/** One line in Innehåll: a chapter, or a scene that stands outside any chapter. */
export interface ContentsRow {
  id: string;
  /** The chapter's number in reading order; null for a scene outside a chapter. */
  number: number | null;
  title: string;
  summary: string;
  when: string;
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
    words: sceneIds.reduce((sum, id) => sum + (summaries[id]?.words ?? 0), 0),
    status: leastFinished(sceneIds.map((id) => summaries[id]?.status ?? "idé")),
    sceneIds,
  };
}

// Parts and folders only group; their chapters and loose scenes are listed in reading order.
function walk(nodes: TreeNode[], numbers: Map<string, number>, summaries: Summaries) {
  return nodes.flatMap((node): ContentsRow[] => {
    if (node.kind === "chapter") return [rowOf(node, numbers.get(node.id) ?? null, summaries)];
    if (node.kind === "scene") return [rowOf(node, null, summaries)];
    return walk(node.children ?? [], numbers, summaries);
  });
}

/** Innehåll in reading order. */
export function contentsRows(tree: TreeNode[], summaries: Summaries): ContentsRow[] {
  const book = tree.filter((node) => node.kind !== "sort" && node.id !== TRASH_ID);
  return walk(book, numberNodes(tree, "chapter"), summaries);
}

/** Tidsordning: the order the writer has dragged the rows into; new rows keep reading order. */
export function inTimeOrder(rows: ContentsRow[], order: string[]): ContentsRow[] {
  const rank = (row: ContentsRow) => {
    const index = order.indexOf(row.id);
    return index === -1 ? order.length + rows.indexOf(row) : index;
  };
  return [...rows].sort((first, second) => rank(first) - rank(second));
}

/** The time order after a row is dropped at `index` among the rows as they are shown. */
export function movedInTime(shown: ContentsRow[], id: string, index: number): string[] {
  const ids = shown.map((row) => row.id).filter((rowId) => rowId !== id);
  return [...ids.slice(0, index), id, ...ids.slice(index)];
}

/** The tree with new text in a node's Innehåll fields. */
export function withNodeText(
  tree: TreeNode[],
  id: string,
  field: "summary" | "when",
  text: string,
): TreeNode[] {
  return tree.map((node) => {
    if (node.id === id) return { ...node, [field]: text };
    return node.children
      ? { ...node, children: withNodeText(node.children, id, field, text) }
      : node;
  });
}
