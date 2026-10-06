import JSZip from "jszip";
import { projectZip } from "../export/projectZip.js";
import { writeAtomic } from "../storage/atomicWrite.js";
import { joinPath, type FileSystem } from "../storage/fileSystem.js";
import { parentOf } from "./libraryFolders.js";
import { freeProjectDir } from "./newProject.js";

// Every book is copied whole to backups/ in Penna's own folder, away from the book itself,
// so a lost or broken book folder can always be brought back.

export interface BackupFile {
  path: string;
  time: number;
  /** A copy the writer named, like "Före redaktören", is kept for good. */
  label: string | null;
}

export interface BookBackups {
  /** The book's name, as its folder was called. */
  book: string;
  files: BackupFile[];
}

const KEEP_NEWEST = 10;
const KEEP_DAYS = 30;
const DAY = 24 * 60 * 60 * 1000;
// The sync's state: a restored copy starts unsynced, so it never writes over the original in Drive.
const SYNC_STATE = ".penna-sync.json";

const pad = (value: number) => String(value).padStart(2, "0");
const bookName = (dir: string) => dir.slice(dir.lastIndexOf("/") + 1).replace(/\.penna$/, "");

// A short mark of where the book lives, so two books in folders of the same name never share copies.
function placeMark(dir: string) {
  let hash = 2166136261;
  for (const letter of dir) hash = Math.imul(hash ^ letter.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16).slice(0, 6);
}

/** "Vintervägen 3f2a1c". */
export const backupFolderOf = (backupsDir: string, dir: string) =>
  joinPath(backupsDir, `${bookName(dir)} ${placeMark(dir)}`);

/** "2026-10-05 17-30.zip", or "2026-10-05 17-30 Före redaktören.zip". */
export function backupFileName(time: number, label: string | null = null) {
  const date = new Date(time);
  const stamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}-${pad(date.getMinutes())}`;
  const safe = label?.replace(/[\\/:*?"<>|.]/g, "").trim();
  return safe ? `${stamp} ${safe}.zip` : `${stamp}.zip`;
}

const FILE_NAME = /^(\d{4})-(\d\d)-(\d\d) (\d\d)-(\d\d)(?: (.+))?\.zip$/;

function backupOf(folder: string, name: string): BackupFile | null {
  const found = FILE_NAME.exec(name);
  if (!found) return null;
  const [year = 0, month = 1, day = 1, hours = 0, minutes = 0] = found.slice(1, 6).map(Number);
  const time = new Date(year, month - 1, day, hours, minutes).getTime();
  return { path: joinPath(folder, name), time, label: found[6] ?? null };
}

/** Newest first. */
export async function backupsIn(fileSystem: FileSystem, folder: string): Promise<BackupFile[]> {
  const files = (await fileSystem.list(folder)).map((name) => backupOf(folder, name));
  return files.filter((file) => file !== null).sort((first, second) => second.time - first.time);
}

/** Every book that has copies, with the copies newest first. */
export async function listBackups(fileSystem: FileSystem, backupsDir: string) {
  const books: BookBackups[] = [];
  for (const folder of await fileSystem.list(backupsDir)) {
    const files = await backupsIn(fileSystem, joinPath(backupsDir, folder));
    if (files.length) books.push({ book: folder.replace(/ [0-9a-f]{6}$/, ""), files });
  }
  return books;
}

/** All but the ten newest, the newest of each of the last thirty days, and every named copy. */
export function backupsToRemove(files: BackupFile[], now: number): BackupFile[] {
  const newest = [...files].sort((first, second) => second.time - first.time);
  const days = new Set<string>();
  return newest.filter((file, index) => {
    const day = new Date(file.time).toDateString();
    const isDaysFirst = !days.has(day) && now - file.time < KEEP_DAYS * DAY;
    days.add(day);
    return index >= KEEP_NEWEST && !isDaysFirst && file.label === null;
  });
}

/** Copies the book under `fileName` (see backupFileName); `dirs` starts with the book's folder. */
export async function takeBackup(
  fileSystem: FileSystem,
  backupsDir: string,
  dirs: string[],
  fileName: string,
) {
  const folder = backupFolderOf(backupsDir, dirs[0] ?? "");
  await fileSystem.makeDir(folder);
  const path = joinPath(folder, fileName);
  await writeAtomic(fileSystem, path, await projectZip(fileSystem, dirs));
  return path;
}

/** The copy's book as a new book next to the others; nothing that exists is written over. */
export async function restoreBackup(
  fileSystem: FileSystem,
  bytes: Uint8Array,
  libraryDir: string,
  copyName: string,
) {
  const zip = await JSZip.loadAsync(bytes);
  const [bookFolder] = Object.keys(zip.files)[0]?.split("/") ?? [];
  const dir = await freeProjectDir(fileSystem, libraryDir, copyName);
  for (const entry of Object.values(zip.files)) {
    const [folder, ...rest] = entry.name.split("/");
    const inner = rest.join("/");
    if (entry.dir || folder !== bookFolder || !inner || inner === SYNC_STATE) continue;
    const path = joinPath(dir, inner);
    await fileSystem.makeDir(parentOf(path));
    await writeAtomic(fileSystem, path, await entry.async("uint8array"));
  }
  return dir;
}
