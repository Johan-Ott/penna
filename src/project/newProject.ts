import { DEMO_PROJECT_DIR, DEMO_PROJECT_FILES } from "../demo/demoProject.js";
import type { ImportedNode } from "../import/markdownImport.js";
import { newSceneText, withSceneStatus } from "../manuscript/sceneFile.js";
import { writeAtomic } from "../storage/atomicWrite.js";
import { joinPath, type FileSystem } from "../storage/fileSystem.js";
import { newSceneId } from "../storage/sceneId.js";
import { parentOf } from "./libraryFolders.js";
import { writeProjectFile } from "./projectFile.js";
import { manuscriptSceneIds, withSpecialFolders, type TreeNode } from "./tree.js";

export interface ProjectDetails {
  title: string;
  type: string;
  dailyGoal: number;
  /** YYYY-MM-DD, or "" when the writer has no deadline. */
  deadline: string;
}

// Characters Windows, macOS or a cloud service refuses in a folder name.
const UNSAFE_IN_NAMES = /[\\/:*?"<>|]/g;

export function projectFolderName(title: string): string {
  const name = title.replace(UNSAFE_IN_NAMES, "").replace(/\s+/g, " ").trim();
  return `${name || "Namnlöst projekt"}.penna`;
}

/** A project folder in the library that does not exist yet: "Isen.penna", "Isen 2.penna", ... */
async function freeProjectDir(fileSystem: FileSystem, libraryDir: string, title: string) {
  const taken = new Set(await fileSystem.list(libraryDir));
  const base = projectFolderName(title).replace(/\.penna$/, "");
  let candidate = `${base}.penna`;
  for (let number = 2; taken.has(candidate); number++) candidate = `${base} ${number}.penna`;
  return joinPath(libraryDir, candidate);
}

const EMPTY_BOOK: ImportedNode[] = [
  {
    kind: "chapter",
    title: "Första kapitlet",
    children: [{ kind: "scene", title: "Första scenen", body: "" }],
  },
];

// Writes each scene of the book as a file and returns the tree that holds them.
async function writeBook(fileSystem: FileSystem, dir: string, book: ImportedNode[]) {
  const tree: TreeNode[] = [];
  for (const node of book) {
    const id = newSceneId();
    if (node.kind !== "scene") {
      tree.push({
        id,
        kind: node.kind,
        title: node.title,
        children: await writeBook(fileSystem, dir, node.children),
      });
      continue;
    }
    const text = newSceneText(id, node.title);
    const file = node.body ? withSceneStatus(text, "utkast") + node.body : text;
    await writeAtomic(fileSystem, joinPath(dir, `scenes/${id}.md`), file);
    tree.push({ id, kind: "scene" });
  }
  return tree;
}

/**
 * A new project. Without a book it gets one chapter and one scene, so the writer can start
 * typing at once; with an imported book it gets the book's parts, chapters and scenes.
 */
export async function createProject(
  fileSystem: FileSystem,
  libraryDir: string,
  details: ProjectDetails,
  book: ImportedNode[] = EMPTY_BOOK,
) {
  const dir = await freeProjectDir(fileSystem, libraryDir, details.title);
  await fileSystem.makeDir(joinPath(dir, "scenes"));
  const tree = await writeBook(fileSystem, dir, book);
  const sceneId = manuscriptSceneIds(tree)[0] ?? null;
  const fields = {
    title: details.title.trim() || "Namnlöst projekt",
    type: details.type,
    dailyGoal: details.dailyGoal,
    ...(details.deadline ? { deadline: details.deadline } : {}),
  };
  await writeProjectFile(fileSystem, dir, fields, withSpecialFolders(tree));
  return { dir, sceneId };
}

/** Writes the example project "Vintervägen" into the library and returns its folder. */
export async function copyExampleProject(fileSystem: FileSystem, libraryDir: string) {
  const dir = await freeProjectDir(fileSystem, libraryDir, "Vintervägen");
  for (const [examplePath, text] of Object.entries(DEMO_PROJECT_FILES)) {
    const path = dir + examplePath.slice(DEMO_PROJECT_DIR.length);
    await fileSystem.makeDir(parentOf(path));
    await writeAtomic(fileSystem, path, text);
  }
  return dir;
}
