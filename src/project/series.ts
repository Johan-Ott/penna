import { joinPath, type FileSystem } from "../storage/fileSystem.js";
import { parentOf } from "./libraryFolders.js";
import { projectFolderName } from "./newProject.js";
import { writeProjectFile } from "./projectFile.js";
import { connectionsOf, withConnection } from "./connections.js";
import { findNode, insertNode, removeNode, withSpecialFolders, type TreeNode } from "./tree.js";

/**
 * A series is a folder beside its books, such as "Vintervägen.serie", built like a project
 * (project.json and scenes/) but holding only notes. A book names it in project.json `series`.
 */
const SUFFIX = ".serie";

export const seriesTitle = (folder: string) => folder.replace(/\.serie$/, "");

/** The folder of the series a book belongs to, or null when it belongs to none. */
export function seriesDirOf(bookDir: string, fields: Record<string, unknown>) {
  const folder = fields["series"];
  return typeof folder === "string" && folder !== "" ? joinPath(parentOf(bookDir), folder) : null;
}

/** The series beside the books in a folder, by folder name. */
export async function listSeries(fileSystem: FileSystem, dir: string) {
  return (await fileSystem.list(dir)).filter((name) => name.endsWith(SUFFIX)).sort();
}

/** Makes an empty series in `dir` and returns its folder name: "Isen.serie", "Isen 2.serie"... */
export async function createSeries(fileSystem: FileSystem, dir: string, title: string) {
  const taken = new Set(await fileSystem.list(dir));
  const base = projectFolderName(title).replace(/\.penna$/, "");
  let folder = `${base}${SUFFIX}`;
  for (let number = 2; taken.has(folder); number++) folder = `${base} ${number}${SUFFIX}`;
  const seriesDir = joinPath(dir, folder);
  await fileSystem.makeDir(joinPath(seriesDir, "scenes"));
  await writeProjectFile(fileSystem, seriesDir, { title, type: "serie" }, withSpecialFolders([]));
  return folder;
}

/** What a move reads and returns of the book and the series: their folder, fields and tree. */
interface NoteFolder {
  dir: string;
  fields: Record<string, unknown>;
  tree: TreeNode[];
}

// The series gets the same sort the note lay in: the fixed ones exist, an own one is made.
function withSortFor(seriesTree: TreeNode[], sort: TreeNode) {
  if (findNode(seriesTree, sort.id)) return seriesTree;
  const copy: TreeNode = { id: sort.id, kind: "sort", title: sort.title ?? "", children: [] };
  return insertNode(seriesTree, copy, null, 0);
}

/**
 * Moves notes into the series by renaming their files, keeping ids and connections; the caller
 * closes an open note first and writes both project.json files with what comes back.
 */
export async function moveNotesToSeries(
  fileSystem: FileSystem,
  book: NoteFolder,
  series: NoteFolder,
  ids: string[],
) {
  let bookTree = book.tree;
  let { tree: seriesTree, fields: seriesFields } = series;
  await fileSystem.makeDir(joinPath(series.dir, "scenes"));
  for (const id of ids) {
    const sort = findNode(bookTree, id)?.parent;
    if (sort?.kind !== "sort") continue;
    await fileSystem.rename(
      joinPath(book.dir, `scenes/${id}.md`),
      joinPath(series.dir, `scenes/${id}.md`),
    );
    seriesTree = withSortFor(seriesTree, sort);
    seriesTree = insertNode(seriesTree, { id, kind: "scene" }, sort.id, Number.MAX_SAFE_INTEGER);
    bookTree = removeNode(bookTree, id);
    for (const connection of connectionsOf(book.fields, id)) {
      seriesFields = { ...seriesFields, ...withConnection(seriesFields, id, connection) };
    }
  }
  return { bookTree, seriesTree, seriesFields };
}
