import type { FileSystem } from "../storage/fileSystem.js";
import { joinPath } from "../storage/fileSystem.js";
import type { TreeNode } from "../project/tree.js";
import { bookOutline, readBookScenes } from "./book.js";

// The scenes up to the second chapter, or the whole book when it has only one.
function firstChapterScenes(tree: TreeNode[]) {
  const ids: string[] = [];
  let chapters = 0;
  for (const item of bookOutline(tree)) {
    if (item.kind === "chapter" && ++chapters > 1) break;
    if (item.kind === "scene") ids.push(item.id);
  }
  return ids;
}

/** Another book's first chapter, as plain paragraphs, to close this book with. */
export async function readExcerpt(fileSystem: FileSystem, dir: string) {
  const project = JSON.parse(await fileSystem.readText(joinPath(dir, "project.json"))) as {
    title?: unknown;
    tree?: unknown;
  };
  const tree = Array.isArray(project.tree) ? (project.tree as TreeNode[]) : [];
  const scenes = await readBookScenes(fileSystem, dir, firstChapterScenes(tree), {});
  const paragraphs: string[] = [];
  scenes.forEach((doc) =>
    doc.descendants((node) => {
      if (node.isTextblock && node.textContent.trim()) paragraphs.push(node.textContent.trim());
      return !node.isTextblock;
    }),
  );
  const title = typeof project.title === "string" ? project.title : "";
  return paragraphs.length > 0 ? { title, text: paragraphs.join("\n\n") } : null;
}
