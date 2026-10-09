import { DEMO_PROJECT_DIR, DEMO_PROJECT_FILES } from "../demo/demoProject.js";
import type { ImportedNode } from "../import/markdownImport.js";
import { newSceneText, withSceneStatus } from "../manuscript/sceneFile.js";
import { writeAtomic } from "../storage/atomicWrite.js";
import { joinPath, type FileSystem } from "../storage/fileSystem.js";
import { newSceneId } from "../storage/sceneId.js";
import { parentOf } from "./libraryFolders.js";
import { writeProjectFile } from "./projectFile.js";
import { manuscriptSceneIds, withSpecialFolders, type TreeNode } from "./tree.js";
import { templateBook, templateOf } from "./templates.js";
import { t } from "../i18n/i18n.js";

export interface ProjectDetails {
  title: string;
  type: string;
  /** The book template it starts from; see templates.ts. */
  template: string;
  dailyGoal: number;
  /** YYYY-MM-DD, or "" when the writer has no deadline. */
  deadline: string;
}

// Characters Windows, macOS or a cloud service refuses in a folder name.
const UNSAFE_IN_NAMES = /[\\/:*?"<>|]/g;

export function projectFolderName(title: string): string {
  const name = title.replace(UNSAFE_IN_NAMES, "").replace(/\s+/g, " ").trim();
  return `${name || t("Namnlöst projekt")}.penna`;
}

/** "Isen.penna", "Isen 2.penna", and so on. */
export async function freeProjectDir(fileSystem: FileSystem, libraryDir: string, title: string) {
  const taken = new Set(await fileSystem.list(libraryDir));
  const base = projectFolderName(title).replace(/\.penna$/, "");
  let candidate = `${base}.penna`;
  for (let number = 2; taken.has(candidate); number++) candidate = `${base} ${number}.penna`;
  return joinPath(libraryDir, candidate);
}

async function writeBook(fileSystem: FileSystem, dir: string, book: ImportedNode[]) {
  const tree: TreeNode[] = [];
  for (const node of book) {
    const id = newSceneId();
    if (node.kind !== "scene") {
      tree.push({
        id,
        kind: node.kind,
        title: node.title,
        ...(node.summary ? { summary: node.summary } : {}),
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

// The template's goal, its labels and its note sorts; the standard labels when it has none.
function templateParts(details: ProjectDetails) {
  const template = templateOf(details.template);
  const labels = template.labels.map(([name = "", color = ""]) => ({
    id: newSceneId(),
    name,
    color,
  }));
  const sorts: TreeNode[] = template.sorts.map((title) => ({
    id: newSceneId(),
    kind: "sort",
    title,
    children: [],
  }));
  return {
    fields: {
      ...(template.totalGoal ? { totalGoal: template.totalGoal } : {}),
      ...(labels.length ? { labels } : {}),
    },
    sorts,
  };
}

/** An imported book, or the template's: by default one chapter and one scene, to start at once. */
export async function createProject(
  fileSystem: FileSystem,
  libraryDir: string,
  details: ProjectDetails,
  book: ImportedNode[] = templateBook(templateOf(details.template), t("Scen 1")),
) {
  const dir = await freeProjectDir(fileSystem, libraryDir, details.title);
  await fileSystem.makeDir(joinPath(dir, "scenes"));
  const tree = await writeBook(fileSystem, dir, book);
  const sceneId = manuscriptSceneIds(tree)[0] ?? null;
  const fromTemplate = templateParts(details);
  const fields = {
    title: details.title.trim() || t("Namnlöst projekt"),
    type: details.type,
    dailyGoal: details.dailyGoal,
    ...(details.deadline ? { deadline: details.deadline } : {}),
    ...fromTemplate.fields,
  };
  await writeProjectFile(
    fileSystem,
    dir,
    fields,
    withSpecialFolders([...tree, ...fromTemplate.sorts]),
  );
  return { dir, sceneId };
}

export async function copyExampleProject(fileSystem: FileSystem, libraryDir: string) {
  const dir = await freeProjectDir(fileSystem, libraryDir, "Vintervägen");
  for (const [examplePath, text] of Object.entries(DEMO_PROJECT_FILES)) {
    const path = dir + examplePath.slice(DEMO_PROJECT_DIR.length);
    await fileSystem.makeDir(parentOf(path));
    await writeAtomic(fileSystem, path, text);
  }
  return dir;
}
