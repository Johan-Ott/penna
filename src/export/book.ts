import type { Node } from "prosemirror-model";
import { parseMarkdown } from "../manuscript/parseMarkdown.js";
import { splitSceneFile } from "../manuscript/sceneFile.js";
import { KIND_LABELS } from "../project/shelf.js";
import { isSpecialFolder, numberNodes, type TreeNode } from "../project/tree.js";
import { joinPath, type FileSystem } from "../storage/fileSystem.js";
import { t } from "../i18n/i18n.js";

export interface BookDetails {
  title: string;
  subtitle: string;
  author: string;
  words: number;
}

/** Swedish keeps ”…”; English opens with “ and closes with ”. Dashes are kept in both. */
export type Typography = "svensk" | "engelsk";

/** Swedish quotes are all ”, so in English every other one opens. */
export function quoteConverter(typography: Typography) {
  let isOpen = false;
  return (text: string) =>
    typography === "svensk"
      ? text
      : text.replace(/”/g, () => {
          isOpen = !isOpen;
          return isOpen ? "“" : "”";
        });
}

export type OutlineItem =
  { kind: "part" | "chapter"; number: number; title: string } | { kind: "scene"; id: string };

/** Stops at the first scene it cannot use and names it. */
export class ExportError extends Error {
  constructor(
    readonly sceneTitle: string,
    readonly reason: string,
  ) {
    super(`${sceneTitle}: ${reason}`);
  }
}

// Folders only group scenes for the writer, so the export reads through them.
export function bookOutline(tree: TreeNode[]): OutlineItem[] {
  const numbers = { part: numberNodes(tree, "part"), chapter: numberNodes(tree, "chapter") };
  const walk = (nodes: TreeNode[]): OutlineItem[] =>
    nodes.flatMap((node) => {
      if (node.kind === "sort" || isSpecialFolder(node.id)) return [];
      const children = walk(node.children ?? []);
      if (node.kind === "scene") return [{ kind: "scene", id: node.id }];
      if (node.kind === "folder") return children;
      const number = numbers[node.kind].get(node.id) ?? 0;
      return [{ kind: node.kind, number, title: node.title ?? "" }, ...children];
    });
  return walk(tree);
}

/** Read before anything is written. `titles` names the scenes in errors. */
export async function readBookScenes(
  fileSystem: FileSystem,
  dir: string,
  sceneIds: string[],
  titles: Record<string, string>,
) {
  const scenes = new Map<string, Node>();
  for (const id of sceneIds) {
    const text = await fileSystem.readText(joinPath(dir, `scenes/${id}.md`)).catch(() => null);
    if (text === null) {
      throw new ExportError(titles[id] ?? id, t("Scenen finns inte på den här datorn än."));
    }
    scenes.set(id, parseMarkdown(splitSceneFile(text).body));
  }
  return scenes;
}

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/** The author set in the project wins over the general one. */
export function bookDetails(
  fields: Record<string, unknown>,
  generalAuthor: string,
  words: number,
): BookDetails {
  return {
    title: text(fields["title"]),
    subtitle: text(fields["subtitle"]) || (KIND_LABELS[text(fields["type"])] ?? ""),
    author: text(fields["author"]) || generalAuthor.trim(),
    words,
  };
}

// A standard manuscript page holds about 250 words.
const WORDS_PER_PAGE = 250;

export function estimatedPages(words: number, outline: OutlineItem[]): number {
  const newPages = outline.filter((item) => item.kind !== "scene").length;
  return 1 + Math.ceil(words / WORDS_PER_PAGE) + newPages;
}
