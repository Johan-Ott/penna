import { DEMO_PROJECT_DIR, DEMO_PROJECT_FILES } from "../demo/demoProject.js";
import type { ImportedNode } from "../import/markdownImport.js";
import { newSceneText, withSceneStatus } from "../manuscript/sceneFile.js";
import { writeAtomic } from "../storage/atomicWrite.js";
import { joinPath, type FileSystem } from "../storage/fileSystem.js";
import { newSceneId } from "../storage/sceneId.js";
import { parentOf } from "./libraryFolders.js";
import { writeProjectFile } from "./projectFile.js";
import type { Narration } from "../manuscript/narration.js";
import { manuscriptSceneIds, withSpecialFolders, type TreeNode } from "./tree.js";
import { readOwnTemplates, OWN_PREFIX } from "./ownTemplates.js";
import { composeTemplate, structures, templateBook, type BookTemplate } from "./templates.js";
import { t } from "../i18n/i18n.js";

export interface ProjectDetails {
  title: string;
  type: string;
  /** The structure it starts from, built in or the writer's own; see templates.ts. */
  structure: string;
  /** The pieces added to it, such as Deckare and Romans. */
  pieces: string[];
  dailyGoal: number;
  /** YYYY-MM-DD, or "" when the writer has no deadline. */
  deadline: string;
  /** How the book is told, which Granska then watches for; null until chosen. */
  narration: Narration | null;
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

// The writer's own templates are read from the Penna folder; the built-in ones from Penna.
async function templateFor(fileSystem: FileSystem, libraryDir: string, details: ProjectDetails) {
  const own = details.structure.startsWith(OWN_PREFIX)
    ? await readOwnTemplates(fileSystem, libraryDir)
    : [];
  const all = [...structures(), ...own];
  const structure = all.find((each) => each.id === details.structure) ?? (all[0] as BookTemplate);
  return composeTemplate(structure, details.pieces);
}

// The template's goal, labels and note sorts; Penna's standard labels when it adds none.
function templateParts(template: BookTemplate) {
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
  const fields = {
    ...(template.totalGoal ? { totalGoal: template.totalGoal } : {}),
    ...(labels.length ? { labels } : {}),
  };
  return { fields, sorts };
}

/** An imported book, or the template's: by default one chapter and one scene, to start at once. */
export async function createProject(
  fileSystem: FileSystem,
  libraryDir: string,
  details: ProjectDetails,
  imported?: ImportedNode[],
) {
  const template = await templateFor(fileSystem, libraryDir, details);
  const dir = await freeProjectDir(fileSystem, libraryDir, details.title);
  await fileSystem.makeDir(joinPath(dir, "scenes"));
  const book = imported ?? templateBook(template, t("Scen 1"));
  const tree = await writeBook(fileSystem, dir, book);
  const sceneId = manuscriptSceneIds(tree)[0] ?? null;
  const fromTemplate = templateParts(template);
  const fields = {
    title: details.title.trim() || t("Namnlöst projekt"),
    type: details.type,
    dailyGoal: details.dailyGoal,
    ...(details.deadline ? { deadline: details.deadline } : {}),
    ...(details.narration ? { narration: details.narration } : {}),
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
