import type { SceneSummary } from "./sceneSummaries.js";
import {
  findNode,
  manuscriptNodes,
  manuscriptSceneIds,
  numberNodes,
  type TreeNode,
} from "./tree.js";

type Summaries = Record<string, SceneSummary>;

const ROMAN: [number, string][] = [
  [40, "XL"],
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

export function romanNumeral(value: number): string {
  let rest = value;
  return ROMAN.reduce((result, [size, numeral]) => {
    const count = Math.floor(rest / size);
    rest -= count * size;
    return result + numeral.repeat(count);
  }, "");
}

export function nodeLabel(node: TreeNode, tree: TreeNode[], summaries: Summaries): string {
  if (node.kind === "scene") return summaries[node.id]?.title ?? "Hittas inte";
  if (node.kind === "folder") return node.title ?? "";
  return numberedLabel(node, tree);
}

function numberedLabel(node: TreeNode, tree: TreeNode[]): string {
  const title = node.title ?? "";
  const number = numberNodes(tree, node.kind === "part" ? "part" : "chapter").get(node.id);
  if (number === undefined) return title;
  return node.kind === "part" ? `Del ${romanNumeral(number)} · ${title}` : `${number}. ${title}`;
}

export function nodeWords(node: TreeNode, summaries: Summaries): number {
  if (node.kind === "scene") return summaries[node.id]?.words ?? 0;
  return (node.children ?? []).reduce((sum, child) => sum + nodeWords(child, summaries), 0);
}

export function shortWordCount(words: number): string {
  if (words < 1000) return String(words);
  if (words < 10000) return `${(words / 1000).toFixed(1).replace(".", ",")}k`;
  return `${Math.round(words / 1000)}k`;
}

/** The small grey text at the end of a tree row. */
export function nodeMeta(node: TreeNode, summaries: Summaries): string {
  if (node.kind === "scene") return (summaries[node.id]?.words ?? 0).toLocaleString("sv-SE");
  if (node.kind === "part") {
    const chapters = (node.children ?? []).filter((child) => child.kind === "chapter").length;
    if (chapters > 0) return `${chapters} kap.`;
  }
  const words = nodeWords(node, summaries);
  return words > 0 ? shortWordCount(words) : "";
}

export interface SceneChapter {
  id: string;
  number: number;
  title: string;
  /** True for the chapter's first scene, where the chapter heading is shown above the text. */
  isFirstScene: boolean;
}

export function chapterOf(tree: TreeNode[], sceneId: string): SceneChapter | null {
  const found = findNode(tree, sceneId);
  const chapter = found?.parent;
  if (!found || chapter?.kind !== "chapter") return null;
  const number = numberNodes(tree, "chapter").get(chapter.id);
  if (number === undefined) return null;
  return { id: chapter.id, number, title: chapter.title ?? "", isFirstScene: found.index === 0 };
}

/** "Ord per kapitel" in Framsteg: each chapter of the manuscript with its label and words. */
export const chapterWords = (tree: TreeNode[], summaries: Summaries) =>
  manuscriptNodes(tree, "chapter").map((node) => ({
    id: node.id,
    label: nodeLabel(node, tree, summaries),
    words: nodeWords(node, summaries),
  }));

/** All words in the manuscript, Research and Papperskorg left out. */
export const manuscriptWords = (tree: TreeNode[], summaries: Summaries) =>
  manuscriptSceneIds(tree).reduce((sum, id) => sum + (summaries[id]?.words ?? 0), 0);
