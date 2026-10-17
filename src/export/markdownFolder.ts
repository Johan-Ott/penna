import JSZip from "jszip";
import { readSceneBodies, type SceneSummary } from "../project/sceneSummaries.js";
import { isInTrash, numberNodes, TRASH_ID, type TreeNode } from "../project/tree.js";
import { nodeLabel } from "../project/treeLabels.js";
import type { FileSystem } from "@llkit/storage/fileSystem.js";
import { t } from "../i18n/i18n.js";

// The book as readable folders and files named after their titles, to read and share. The
// book's own folder keeps scenes by id, so a rename never moves a file; this is only a copy.

type Book = {
  dir: string;
  name: string;
  tree: TreeNode[];
  summaries: Record<string, SceneSummary>;
};

const safeName = (name: string) => name.replace(/[\\/:*?"<>|]/g, "").trim() || t("Namnlös");
const numbered = (number: number, title: string) =>
  `${String(number).padStart(2, "0")} ${safeName(title)}`;

// A name taken twice in one folder gets a number, so no text writes over another.
function freeName(taken: Set<string>, name: string) {
  let free = name;
  for (let count = 2; taken.has(free); count++) free = `${name} ${count}`;
  taken.add(free);
  return free;
}

interface Walk {
  book: Book;
  bodies: Record<string, string>;
  zip: JSZip;
  chapters: Map<string, number>;
  parts: Map<string, number>;
}

function folderName(walk: Walk, node: TreeNode) {
  const title = nodeLabel(node, walk.book.tree, walk.book.summaries);
  if (node.kind === "part")
    return `${t("Del")} ${walk.parts.get(node.id) ?? ""} ${safeName(node.title ?? "")}`.trim();
  if (node.kind === "chapter") return numbered(walk.chapters.get(node.id) ?? 0, node.title ?? "");
  return safeName(title);
}

function addScene(walk: Walk, node: TreeNode, path: string, name: (title: string) => string) {
  const title = walk.book.summaries[node.id]?.title ?? t("Namnlös scen");
  walk.zip.file(`${path}/${name(title)}.md`, `# ${title}\n\n${walk.bodies[node.id] ?? ""}`);
}

function addNodes(walk: Walk, nodes: TreeNode[], path: string, isNotes: boolean) {
  const taken = new Set<string>();
  nodes.forEach((node, index) => {
    if (node.id === TRASH_ID || isInTrash(walk.book.tree, node.id)) return;
    if (node.kind !== "scene") {
      const folder = `${path}/${freeName(taken, folderName(walk, node))}`;
      return addNodes(walk, node.children ?? [], folder, isNotes);
    }
    const name = (title: string) =>
      freeName(taken, isNotes ? safeName(title) : numbered(index + 1, title));
    addScene(walk, node, path, name);
  });
}

const sceneIdsOf = (nodes: TreeNode[]): string[] =>
  nodes.flatMap((node) => (node.kind === "scene" ? [node.id] : sceneIdsOf(node.children ?? [])));

/** The whole book as a zip of folders and Markdown files, notes in an Anteckningar folder. */
export async function markdownFolderZip(fileSystem: FileSystem, book: Book) {
  const refs = sceneIdsOf(book.tree).map((id) => ({ dir: book.dir, id }));
  const bodies = await readSceneBodies(fileSystem, refs);
  const zip = new JSZip();
  const walk = {
    book,
    bodies,
    zip,
    chapters: numberNodes(book.tree, "chapter"),
    parts: numberNodes(book.tree, "part"),
  };
  const root = safeName(book.name);
  addNodes(
    walk,
    book.tree.filter((node) => node.kind !== "sort"),
    root,
    false,
  );
  addNodes(
    walk,
    book.tree.filter((node) => node.kind === "sort"),
    `${root}/${t("Anteckningar")}`,
    true,
  );
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
