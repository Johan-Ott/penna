import {
  joinSceneFile,
  newSceneText,
  SCENE_STATUSES,
  splitSceneFile,
  withSceneStatus,
  withSceneTitle,
  type SceneStatus,
} from "../manuscript/sceneFile.js";
import { writeAtomic } from "../storage/atomicWrite.js";
import { joinPath, scenePath, type FileSystem } from "../storage/fileSystem.js";
import { openProjectFolder } from "../storage/projectFolder.js";
import { newSceneId } from "../storage/sceneId.js";
import { withNodeText } from "./contents.js";
import { readProjectFile, writeProjectFile } from "./projectFile.js";
import { readSceneSummaries } from "./sceneSummaries.js";
import {
  findNode,
  insertAfter,
  insertNode,
  moveToTrash,
  reconcileScenes,
  removeNode,
  renameNode,
  sortsOf,
  type NodeKind,
  type TreeNode,
} from "./tree.js";
import { nodeLabel } from "./treeLabels.js";

// A book changed straight in its folder, without Penna running, with the app's own tree
// functions; a running Penna sees the files change. docs/format.md describes the files.

export type BookFolder = { fileSystem: FileSystem; dir: string };

async function read({ fileSystem, dir }: BookFolder) {
  const listing = await openProjectFolder(fileSystem, dir);
  const file = await readProjectFile(fileSystem, dir, listing.scenes);
  if (file.isNewerFormat) throw new Error("Boken är sparad av en nyare Penna och läses bara.");
  const { tree } = reconcileScenes(file.tree, listing.scenes);
  const summaries = await readSceneSummaries(fileSystem, dir, listing.scenes);
  return { fields: file.fields, tree, summaries };
}

// From the tree as project.json has it: a scene file just written, not yet in the tree, would
// otherwise be found as a loose scene and placed twice.
async function changeTree(book: BookFolder, change: (tree: TreeNode[]) => TreeNode[]) {
  const listing = await openProjectFolder(book.fileSystem, book.dir);
  const file = await readProjectFile(book.fileSystem, book.dir, listing.scenes);
  if (file.isNewerFormat) throw new Error("Boken är sparad av en nyare Penna och läses bara.");
  await writeProjectFile(book.fileSystem, book.dir, file.fields, change(file.tree));
}

// A scene's file is its front matter, between --- lines, and its text in Markdown.
async function changeScene(
  book: BookFolder,
  id: string,
  change: (parts: { frontMatter: string; body: string }) => { frontMatter: string; body: string },
) {
  const path = scenePath(book.dir, id);
  const parts = splitSceneFile(await book.fileSystem.readText(path));
  await writeAtomic(book.fileSystem, path, joinSceneFile(change(parts)));
}

async function newScene(book: BookFolder, title: string) {
  const id = newSceneId();
  await book.fileSystem.makeDir(joinPath(book.dir, "scenes"));
  await writeAtomic(book.fileSystem, scenePath(book.dir, id), newSceneText(id, title));
  return id;
}

// A chapter starts with a scene, as in the app, so there is somewhere to write at once.
async function newNode(book: BookFolder, kind: NodeKind, title: string): Promise<TreeNode> {
  if (kind === "scene") return { id: await newScene(book, title), kind };
  const children: TreeNode[] =
    kind === "chapter" ? [{ id: await newScene(book, "Scen 1"), kind: "scene" }] : [];
  return { id: newSceneId(), kind, title, children };
}

/** The tree as rows, as `penna.mjs tree` prints it with the app running. */
export async function treeRows(book: BookFolder) {
  const { tree, summaries } = await read(book);
  const walk = (nodes: TreeNode[], depth: number): object[] =>
    nodes.flatMap((node) => [
      { id: node.id, kind: node.kind, title: nodeLabel(node, tree, summaries), depth },
      ...walk(node.children ?? [], depth + 1),
    ]);
  return walk(tree, 0);
}

const FIELDS: Record<string, "summary" | "when" | "pov"> = {
  vad: "summary",
  när: "when",
  pov: "pov",
};

// New parts of the book: a scene, chapter, part or folder, and a note in a sort.
const makeCalls = (book: BookFolder) => ({
  add: async (kind: NodeKind, title: string, afterId?: string) => {
    const node = await newNode(book, kind, title);
    await changeTree(book, (tree) => insertAfter(tree, node, afterId ?? null));
    return node.id;
  },
  /** A note in a sort by its id or its name, as the tree shows it; a new sort if none is. */
  note: async (sort: string, name: string) => {
    const { tree, summaries } = await read(book);
    const found = sortsOf(tree).find(
      (node) =>
        node.id === sort || nodeLabel(node, tree, summaries).toLowerCase() === sort.toLowerCase(),
    );
    const sortNode: TreeNode = found ?? {
      id: newSceneId(),
      kind: "sort",
      title: sort,
      children: [],
    };
    const id = await newScene(book, name);
    const note: TreeNode = { id, kind: "scene" };
    await changeTree(book, (now) => {
      const withSort = found ? now : insertNode(now, sortNode, null, 0);
      return insertNode(withSort, note, sortNode.id, Number.MAX_SAFE_INTEGER);
    });
    return id;
  },
});

// A scene's own file: its text, its title and its step.
const sceneCalls = (book: BookFolder) => ({
  read: (id: string) => book.fileSystem.readText(scenePath(book.dir, id)),
  /** The scene's text replaced; its front matter, title and status are kept. */
  write: (id: string, body: string) => changeScene(book, id, (parts) => ({ ...parts, body })),
  status: (id: string, status: string) => {
    if (!(SCENE_STATUSES as readonly string[]).includes(status))
      throw new Error(`Status är en av ${SCENE_STATUSES.join(", ")}.`);
    return changeScene(book, id, (parts) => ({
      ...parts,
      frontMatter: withSceneStatus(parts.frontMatter, status as SceneStatus),
    }));
  },
});

// The tree: names, Vad händer?, När and Vems ögon, the order, and the trash.
const treeCalls = (book: BookFolder) => ({
  rename: async (id: string, title: string) => {
    if (findNode((await read(book)).tree, id)?.node.kind !== "scene")
      return changeTree(book, (tree) => renameNode(tree, id, title));
    return changeScene(book, id, (parts) => ({
      ...parts,
      frontMatter: withSceneTitle(parts.frontMatter, title),
    }));
  },
  set: (id: string, field: string, text: string) => {
    const key = FIELDS[field.toLowerCase()];
    if (!key) throw new Error(`Fältet heter vad, när eller pov, inte ${field}.`);
    return changeTree(book, (tree) => withNodeText(tree, id, key, text));
  },
  move: (id: string, afterId: string) =>
    changeTree(book, (tree) => {
      const node = findNode(tree, id)?.node;
      return node ? insertAfter(removeNode(tree, id), node, afterId) : tree;
    }),
  trash: (id: string) => changeTree(book, (tree) => moveToTrash(tree, id)),
});

/** The calls of `penna.mjs`, on the files: the same names and arguments as through the app. */
export const bookFileCalls = (book: BookFolder) => ({
  tree: () => treeRows(book),
  ...makeCalls(book),
  ...sceneCalls(book),
  ...treeCalls(book),
});
