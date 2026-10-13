import { DAY } from "./stats.js";
import { ownStepName } from "./statusSteps.js";
import { SCENE_STATUSES, type SceneStatus } from "../manuscript/sceneFile.js";
import { joinPath, type FileSystem, scenePath } from "../storage/fileSystem.js";
import { openProjectFolder } from "../storage/projectFolder.js";
import { readSceneSummaries, type SceneSummary } from "./sceneSummaries.js";
import { seriesTitle } from "./series.js";
import { manuscriptSceneIds, type TreeNode } from "./tree.js";
import { t } from "../i18n/i18n.js";

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
  /** The series the book belongs to, by name, or null. */
  series: string | null;
  /** The book's place in its series, or null when it has none. */
  seriesNumber: number | null;
}

const STATUS_LABELS: Record<SceneStatus, string> = {
  idé: t("Idé"),
  utkast: t("Första utkast"),
  redigering: t("Redigering"),
  klar: t("Klar"),
};
export const KIND_LABELS: Record<string, string> = {
  roman: t("Roman"),
  noveller: t("Noveller"),
  fackbok: t("Fackbok"),
  annat: t("Annat"),
};

/** On a tie the earlier stage. */
export function bookStatus(
  scenes: Pick<SceneSummary, "words" | "status">[],
  fields: Record<string, unknown> = {},
): string {
  const wordsIn = (status: SceneStatus) =>
    scenes.filter((scene) => scene.status === status).reduce((sum, scene) => sum + scene.words, 0);
  const largest = SCENE_STATUSES.reduce((best, status) =>
    wordsIn(status) > wordsIn(best) ? status : best,
  );
  return ownStepName(fields, largest) ?? STATUS_LABELS[largest];
}

export function bookProgress(scenes: Pick<SceneSummary, "words" | "status">[]): number {
  const total = scenes.reduce((sum, scene) => sum + scene.words, 0);
  const finished = scenes
    .filter((scene) => scene.status === "klar")
    .reduce((sum, scene) => sum + scene.words, 0);
  return total === 0 ? 0 : Math.round((100 * finished) / total);
}

const startOfDay = (time: number) => new Date(time).setHours(0, 0, 0, 0);

export function whenUpdated(time: number, now: number): string {
  const days = Math.round((startOfDay(now) - startOfDay(time)) / DAY);
  if (days <= 0) return t("Skrivet idag");
  if (days === 1) return t("Igår");
  if (days < 7) return t("För {days} dagar sedan", { days });
  if (days < 30) return t("För {weeks} veckor sedan", { weeks: Math.floor(days / 7) });
  return new Date(time).toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export const folderTitle = (dir: string) => (dir.split("/").pop() ?? dir).replace(/\.penna$/, "");

// A broken project.json is repaired when the project opens, not here.
async function readProjectFields(fileSystem: FileSystem, dir: string) {
  try {
    const parsed = JSON.parse(await fileSystem.readText(joinPath(dir, "project.json"))) as Record<
      string,
      unknown
    >;
    const tree = Array.isArray(parsed["tree"]) ? (parsed["tree"] as TreeNode[]) : [];
    const series = typeof parsed["series"] === "string" ? seriesTitle(parsed["series"]) : null;
    const number = parsed["seriesNumber"];
    const seriesNumber = typeof number === "number" ? number : null;
    return { title: parsed["title"], type: parsed["type"], tree, series, seriesNumber };
  } catch {
    return { title: undefined, type: undefined, tree: [], series: null, seriesNumber: null };
  }
}

// A project without a usable tree counts every scene file.
async function bookSceneIds(fileSystem: FileSystem, dir: string, tree: TreeNode[]) {
  const onDisk = (await openProjectFolder(fileSystem, dir)).scenes;
  const inManuscript = manuscriptSceneIds(tree).filter((id) => onDisk.includes(id));
  return inManuscript.length > 0 ? inManuscript : onDisk;
}

async function lastChange(fileSystem: FileSystem, dir: string, sceneIds: string[]) {
  const paths = [...sceneIds.map((id) => scenePath(dir, id)), joinPath(dir, "project.json")];
  const times = await Promise.all(paths.map((path) => fileSystem.modifiedAt(path)));
  const known = times.filter((time): time is number => time !== null);
  return known.length > 0 ? Math.max(...known) : null;
}

const missingBook = (dir: string): ShelfBook => ({
  dir,
  title: folderTitle(dir),
  kind: "",
  words: 0,
  status: "",
  progress: 0,
  updatedAt: null,
  isMissing: true,
  series: null,
  seriesNumber: null,
});

async function readBook(fileSystem: FileSystem, dir: string): Promise<ShelfBook> {
  if ((await fileSystem.list(dir)).length === 0) return missingBook(dir);
  const fields = await readProjectFields(fileSystem, dir);
  const sceneIds = await bookSceneIds(fileSystem, dir, fields.tree);
  const scenes = Object.values(await readSceneSummaries(fileSystem, dir, sceneIds));
  return {
    dir,
    title: typeof fields.title === "string" ? fields.title : folderTitle(dir),
    kind: (typeof fields.type === "string" && KIND_LABELS[fields.type]) || t("Projekt"),
    words: scenes.reduce((sum, scene) => sum + scene.words, 0),
    status: bookStatus(scenes, fields),
    progress: bookProgress(scenes),
    updatedAt: await lastChange(fileSystem, dir, sceneIds),
    isMissing: false,
    series: fields.series,
    seriesNumber: fields.seriesNumber,
  };
}

/** Missing ones last. */
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

// Numbered books first, by number; the rest after them as they were.
const inSeriesOrder = (books: ShelfBook[]) =>
  [...books].sort(
    (one, other) =>
      (one.seriesNumber ?? Number.MAX_SAFE_INTEGER) -
      (other.seriesNumber ?? Number.MAX_SAFE_INTEGER),
  );

export function shelfGroups(books: ShelfBook[]) {
  const names = [...new Set(books.map((book) => book.series))];
  const ordered = [null, ...names.filter((name) => name !== null)];
  return ordered
    .map((series) => ({
      series,
      books: inSeriesOrder(books.filter((book) => book.series === series)),
    }))
    .filter((group) => group.books.length > 0);
}
