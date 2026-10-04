import { plainText } from "../manuscript/compare.js";
import { parseMarkdown } from "../manuscript/parseMarkdown.js";
import {
  joinSceneFile,
  readField,
  splitSceneFile,
  withTextField,
} from "../manuscript/sceneFile.js";
import { changedWords } from "../manuscript/wordDiff.js";
import { countDocumentWords } from "../manuscript/wordCount.js";
import { writeAtomic } from "../storage/atomicWrite.js";
import { joinPath, type FileSystem } from "../storage/fileSystem.js";
import { t } from "../i18n/i18n.js";

/** Which scene: the project folder and the scene id. */
export interface SceneRef {
  dir: string;
  id: string;
}

/** A copy of a scene file in snapshots/<scene id>/, named after when it was taken. */
export interface Snapshot {
  fileName: string;
  time: number;
  /** The writer's name for a manual snapshot, like "Före omskrivning". */
  label: string | null;
  isManual: boolean;
  body: string;
  words: number;
}

/** A save that changes at least this many words since the last snapshot is "större ändring". */
export const SNAPSHOT_WORDS = 100;

const pad = (value: number) => String(value).padStart(2, "0");
const FILE_NAME = /^(\d{4})-(\d\d)-(\d\d)T(\d\d)-(\d\d)(?:-\d+)?\.md$/;

export function snapshotFileName(time: number): string {
  const date = new Date(time);
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `${day}T${pad(date.getHours())}-${pad(date.getMinutes())}.md`;
}

function timeOf(fileName: string): number | null {
  const parts = FILE_NAME.exec(fileName)?.slice(1).map(Number);
  if (!parts) return null;
  const [year = 0, month = 1, day = 1, hours = 0, minutes = 0] = parts;
  return new Date(year, month - 1, day, hours, minutes).getTime();
}

const snapshotDir = (scene: SceneRef) => joinPath(scene.dir, `snapshots/${scene.id}`);
const wordsIn = (body: string) => countDocumentWords(parseMarkdown(body));

// Newest first. "-2" marks a later snapshot taken the same minute, a longer name a later one.
const newestFirst = (first: Snapshot, second: Snapshot) =>
  second.time - first.time ||
  second.fileName.length - first.fileName.length ||
  (second.fileName > first.fileName ? 1 : -1);

export async function listSnapshots(fileSystem: FileSystem, scene: SceneRef) {
  const folder = snapshotDir(scene);
  const snapshots: Snapshot[] = [];
  for (const fileName of await fileSystem.list(folder)) {
    const time = timeOf(fileName);
    if (time === null) continue;
    const text = await fileSystem.readText(joinPath(folder, fileName));
    const { frontMatter, body } = splitSceneFile(text);
    const isManual = readField(frontMatter, "snapshot") === "manuell";
    const label = readField(frontMatter, "label");
    snapshots.push({ fileName, time, label, isManual, body, words: wordsIn(body) });
  }
  return snapshots.sort(newestFirst);
}

/** Saves a snapshot of a scene text. With a label it is manual, otherwise automatic. */
export async function takeSnapshot(
  fileSystem: FileSystem,
  scene: SceneRef,
  sceneText: string,
  when: { time: number; label?: string },
) {
  const { time, label } = when;
  const folder = snapshotDir(scene);
  await fileSystem.makeDir(folder);
  const taken = await fileSystem.list(folder);
  const base = snapshotFileName(time).replace(/\.md$/, "");
  let fileName = `${base}.md`;
  for (let number = 2; taken.includes(fileName); number++) fileName = `${base}-${number}.md`;
  const { frontMatter, body } = splitSceneFile(sceneText);
  let marked = withTextField(
    frontMatter,
    "snapshot",
    label === undefined ? "automatisk" : "manuell",
  );
  if (label) marked = withTextField(marked, "label", label);
  await writeAtomic(
    fileSystem,
    joinPath(folder, fileName),
    joinSceneFile({ frontMatter: marked, body }),
  );
  return fileName;
}

/**
 * After a save: the text from before it is kept when the scene had no snapshot yet, or when the
 * new text has moved SNAPSHOT_WORDS words or more away from the last one.
 */
export async function snapshotOnSave(
  fileSystem: FileSystem,
  scene: SceneRef,
  save: { before: string; after: string },
  time: number,
) {
  const beforeBody = splitSceneFile(save.before).body;
  if (wordsIn(beforeBody) === 0) return false;
  const latest = (await listSnapshots(fileSystem, scene))[0];
  if (latest) {
    if (plainText(latest.body) === plainText(beforeBody)) return false;
    const afterBody = splitSceneFile(save.after).body;
    if (changedWords(plainText(latest.body), plainText(afterBody)) < SNAPSHOT_WORDS) return false;
  }
  await takeSnapshot(fileSystem, scene, save.before, { time });
  return true;
}

/** Short Swedish month names, as dates are written in the app: "2 okt". */
export const MONTHS = [
  "jan",
  "feb",
  "mars",
  "apr",
  "maj",
  "juni",
  "juli",
  "aug",
  "sep",
  "okt",
  "nov",
  "dec",
];
const DAY = 24 * 60 * 60 * 1000;

/** "Idag 11:20", "Igår 14:03" or "2 okt 14:03", as the snapshot list shows it. */
export function snapshotWhen(time: number, now: number): string {
  const date = new Date(time);
  const clock = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const days = Math.round(
    (new Date(now).setHours(0, 0, 0, 0) - new Date(time).setHours(0, 0, 0, 0)) / DAY,
  );
  if (days === 0) return `Idag ${clock}`;
  if (days === 1) return t("Igår {clock}", { clock });
  return `${date.getDate()} ${MONTHS[date.getMonth()] ?? ""} ${clock}`;
}
