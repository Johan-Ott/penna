import { SCENE_STATUSES, type SceneStatus } from "../manuscript/sceneFile.js";
import { joinPath, type FileSystem } from "../storage/fileSystem.js";
import { openProjectFolder } from "../storage/projectFolder.js";
import { readSceneSummaries, type SceneSummary } from "./sceneSummaries.js";
import { manuscriptSceneIds, type TreeNode } from "./tree.js";

export interface ShelfBook {
  dir: string;
  title: string;
  kind: string;
  words: number;
  status: string;
  /** Percent of the words that sit in finished scenes. */
  progress: number;
  updatedAt: number | null;
  /** The folder is gone: moved, renamed or on a disk that is not connected. */
  isMissing: boolean;
}

const STATUS_LABELS: Record<SceneStatus, string> = {
  idé: "Idé",
  utkast: "Utkast",
  redigering: "Redigering",
  klar: "Klar",
};
/** The project types from onboarding, as a book cover or a subtitle names them. */
export const KIND_LABELS: Record<string, string> = {
  roman: "Roman",
  noveller: "Noveller",
  fackbok: "Fackbok",
  annat: "Annat",
};
const DAY = 24 * 60 * 60 * 1000;

/** The stage that holds the most words; on a tie the earlier stage. */
export function bookStatus(scenes: Pick<SceneSummary, "words" | "status">[]): string {
  const wordsIn = (status: SceneStatus) =>
    scenes.filter((scene) => scene.status === status).reduce((sum, scene) => sum + scene.words, 0);
  const largest = SCENE_STATUSES.reduce((best, status) =>
    wordsIn(status) > wordsIn(best) ? status : best,
  );
  return STATUS_LABELS[largest];
}

export function bookProgress(scenes: Pick<SceneSummary, "words" | "status">[]): number {
  const total = scenes.reduce((sum, scene) => sum + scene.words, 0);
  const finished = scenes
    .filter((scene) => scene.status === "klar")
    .reduce((sum, scene) => sum + scene.words, 0);
  return total === 0 ? 0 : Math.round((100 * finished) / total);
}

const startOfDay = (time: number) => new Date(time).setHours(0, 0, 0, 0);

/** "Skrivet idag", "Igår", "För 3 dagar sedan", "För 2 veckor sedan" or a date. */
export function whenUpdated(time: number, now: number): string {
  const days = Math.round((startOfDay(now) - startOfDay(time)) / DAY);
  if (days <= 0) return "Skrivet idag";
  if (days === 1) return "Igår";
  if (days < 7) return `För ${days} dagar sedan`;
  if (days < 30) return `För ${Math.floor(days / 7)} veckor sedan`;
  return new Date(time).toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const folderTitle = (dir: string) => (dir.split("/").pop() ?? dir).replace(/\.penna$/, "");

// The shelf only reads. A broken project.json is repaired when the project is opened, not here.
async function readProjectFields(fileSystem: FileSystem, dir: string) {
  try {
    const parsed = JSON.parse(await fileSystem.readText(joinPath(dir, "project.json"))) as Record<
      string,
      unknown
    >;
    const tree = Array.isArray(parsed["tree"]) ? (parsed["tree"] as TreeNode[]) : [];
    return { title: parsed["title"], type: parsed["type"], tree };
  } catch {
    return { title: undefined, type: undefined, tree: [] };
  }
}

// Scenes in the manuscript count; a project without a usable tree counts every scene file.
async function bookSceneIds(fileSystem: FileSystem, dir: string, tree: TreeNode[]) {
  const onDisk = (await openProjectFolder(fileSystem, dir)).scenes;
  const inManuscript = manuscriptSceneIds(tree).filter((id) => onDisk.includes(id));
  return inManuscript.length > 0 ? inManuscript : onDisk;
}

async function lastChange(fileSystem: FileSystem, dir: string, sceneIds: string[]) {
  const paths = [
    ...sceneIds.map((id) => joinPath(dir, `scenes/${id}.md`)),
    joinPath(dir, "project.json"),
  ];
  const times = await Promise.all(paths.map((path) => fileSystem.modifiedAt(path)));
  const known = times.filter((time): time is number => time !== null);
  return known.length > 0 ? Math.max(...known) : null;
}

async function readBook(fileSystem: FileSystem, dir: string): Promise<ShelfBook> {
  const title = folderTitle(dir);
  if ((await fileSystem.list(dir)).length === 0) {
    return {
      dir,
      title,
      kind: "",
      words: 0,
      status: "",
      progress: 0,
      updatedAt: null,
      isMissing: true,
    };
  }
  const fields = await readProjectFields(fileSystem, dir);
  const sceneIds = await bookSceneIds(fileSystem, dir, fields.tree);
  const scenes = Object.values(await readSceneSummaries(fileSystem, dir, sceneIds));
  return {
    dir,
    title: typeof fields.title === "string" ? fields.title : title,
    kind: (typeof fields.type === "string" && KIND_LABELS[fields.type]) || "Projekt",
    words: scenes.reduce((sum, scene) => sum + scene.words, 0),
    status: bookStatus(scenes),
    progress: bookProgress(scenes),
    updatedAt: await lastChange(fileSystem, dir, sceneIds),
    isMissing: false,
  };
}

/** The projects in the Penna folder and those opened from elsewhere, missing ones last. */
export async function readShelf(
  fileSystem: FileSystem,
  libraryDir: string | null,
  knownDirs: string[],
) {
  const inLibrary = libraryDir
    ? (await fileSystem.list(libraryDir))
        .filter((name) => name.endsWith(".penna"))
        .map((name) => joinPath(libraryDir, name))
    : [];
  const dirs = [...new Set([...inLibrary, ...knownDirs])];
  const books = await Promise.all(dirs.map((dir) => readBook(fileSystem, dir)));
  return [...books.filter((book) => !book.isMissing), ...books.filter((book) => book.isMissing)];
}
