import { writeAtomic } from "../storage/atomicWrite.js";
import { joinPath, type FileSystem } from "../storage/fileSystem.js";
import { labelsOf } from "./labels.js";
import { projectGoals } from "./progress.js";
import type { BookTemplate } from "./templates.js";
import { isSpecialFolder, type TreeNode } from "./tree.js";

// The writer's own templates: one JSON file each in the Penna folder's mallar/, to keep or share.

/** Own templates' ids start with this, so they are told from the built-in structures. */
export const OWN_PREFIX = "egen:";

const folderOf = (library: string) => joinPath(library, "mallar");
const fileName = (name: string) => `${name.replace(/[\\/:*?"<>|]/g, "").trim() || "Mall"}.json`;

const isTextList = (value: unknown) =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

function isTemplate(value: unknown): value is BookTemplate {
  const template = value as Partial<BookTemplate> | null;
  return (
    typeof template?.name === "string" &&
    isTextList(template.sorts) &&
    Array.isArray(template.labels) &&
    template.labels.every(isTextList) &&
    Array.isArray(template.parts) &&
    template.parts.every((part) => typeof part.title === "string" && Array.isArray(part.chapters))
  );
}

/** A template as written in a file, or null when it is not one. */
export function parseTemplate(text: string, id: string): BookTemplate | null {
  try {
    const parsed: unknown = JSON.parse(text);
    if (!isTemplate(parsed)) return null;
    return { ...parsed, id, hint: parsed.hint ?? "", totalGoal: parsed.totalGoal ?? null };
  } catch {
    return null;
  }
}

export async function readOwnTemplates(fileSystem: FileSystem, library: string) {
  const names: string[] = await fileSystem.list(folderOf(library)).catch(() => []);
  const read = async (name: string) =>
    parseTemplate(
      await fileSystem.readText(joinPath(folderOf(library), name)).catch(() => ""),
      `${OWN_PREFIX}${name}`,
    );
  const found = await Promise.all(names.filter((name) => name.endsWith(".json")).map(read));
  return found.filter((template): template is BookTemplate => template !== null);
}

export async function saveOwnTemplate(
  fileSystem: FileSystem,
  library: string,
  template: BookTemplate,
) {
  await fileSystem.makeDir(folderOf(library));
  // The id is the file's name, so it is not written into the file.
  const text = `${JSON.stringify({ ...template, id: undefined }, null, 2)}\n`;
  await writeAtomic(fileSystem, joinPath(folderOf(library), fileName(template.name)), text);
}

const chapterOf = (node: TreeNode) => [node.title ?? "", node.summary ?? ""];

// Parts keep their chapters; chapters straight in the book are gathered between the parts.
function partsOf(tree: TreeNode[]): BookTemplate["parts"] {
  const parts: BookTemplate["parts"] = [];
  for (const node of tree) {
    if (node.kind === "part") {
      const chapters = (node.children ?? []).filter((child) => child.kind === "chapter");
      parts.push({ title: node.title ?? "", chapters: chapters.map(chapterOf) });
    } else if (node.kind === "chapter") {
      const last = parts.at(-1);
      if (last && last.title === "") last.chapters.push(chapterOf(node));
      else parts.push({ title: "", chapters: [chapterOf(node)] });
    }
  }
  return parts;
}

/** A book's shape as a template: parts, chapters and what happens in them, notes, labels and goal. */
export function templateFromBook(
  name: string,
  book: { tree: TreeNode[]; fields: Record<string, unknown> },
): BookTemplate {
  const sorts = book.tree.filter((node) => node.kind === "sort" && !isSpecialFolder(node.id));
  return {
    id: "",
    name,
    hint: "",
    totalGoal: projectGoals(book.fields).totalGoal,
    sorts: sorts.map((sort) => sort.title ?? ""),
    labels: labelsOf(book.fields).map((label) => [label.name, label.color]),
    parts: partsOf(book.tree),
  };
}
