import { takeSnapshot } from "../project/snapshots.js";
import { joinPath, type FileSystem } from "../storage/fileSystem.js";

/** Wraps each write over a file here; the app saves the open scene first and reads it after. */
export type WriteGuard = (path: string, write: () => Promise<void>) => Promise<void>;

export interface LocalBook {
  fileSystem: FileSystem;
  dir: string;
  guard: WriteGuard;
}

export async function hashOf(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-1", bytes as BufferSource);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

const sameBytes = async (one?: Uint8Array, other?: Uint8Array) =>
  one && other ? (await hashOf(one)) === (await hashOf(other)) : one === other;

export const DOWNLOAD_SUFFIX = ".penna-download";

// Written beside and renamed, so a half-downloaded file never replaces a whole one. The name
// differs from the autosave's temp file, so the two never pick up each other's text.
export async function writeLocal(book: LocalBook, path: string, bytes: Uint8Array) {
  const target = joinPath(book.dir, path);
  await book.fileSystem.makeDir(target.slice(0, target.lastIndexOf("/")));
  await book.fileSystem.writeBytes(`${target}${DOWNLOAD_SUFFIX}`, bytes);
  await book.fileSystem.rename(`${target}${DOWNLOAD_SUFFIX}`, target);
}

export const readLocal = (book: LocalBook, path: string) =>
  book.fileSystem.readBytes(joinPath(book.dir, path)).catch(() => undefined);

// A file changed here while the sync worked waits for the next sync instead of being replaced.
export async function replaceLocal(
  book: LocalBook,
  path: string,
  was: Uint8Array | undefined,
  bytes: Uint8Array,
) {
  let isWritten = false;
  await book.guard(joinPath(book.dir, path), async () => {
    if (!(await sameBytes(await readLocal(book, path), was))) return;
    await writeLocal(book, path, bytes);
    isWritten = true;
  });
  return isWritten;
}

/** Under a free name, so an older file in trash/ is never replaced. */
export async function moveToTrash(book: LocalBook, path: string) {
  const { fileSystem, dir } = book;
  await fileSystem.makeDir(joinPath(dir, "trash"));
  const taken = await fileSystem.list(joinPath(dir, "trash"));
  const name = path.slice(path.lastIndexOf("/") + 1);
  const dot = name.lastIndexOf(".");
  const [stem, extension] = dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ""];
  let free = name;
  for (let number = 2; taken.includes(free); number++) free = `${stem} ${number}${extension}`;
  await fileSystem.rename(joinPath(dir, path), joinPath(dir, `trash/${free}`));
  return `trash/${free}`;
}

const SCENE_PATH = /^scenes\/([^/]+)\.md$/;

export async function keepVersion(book: LocalBook, path: string, bytes: Uint8Array, now: number) {
  const id = SCENE_PATH.exec(path)?.[1];
  if (!id) return;
  const text = new TextDecoder().decode(bytes);
  await takeSnapshot(book.fileSystem, { dir: book.dir, id }, text, { time: now });
}

/** Drive's side of a conflict: "scenes/S1.md" becomes "scenes/S1 (Drive 2026-10-04).md",
 * or "... 2.md" when that day already has one. */
export async function conflictCopyPath(book: LocalBook, path: string, now: number) {
  const day = new Date(now).toISOString().slice(0, 10);
  const dot = path.lastIndexOf(".");
  const cut = dot > path.lastIndexOf("/") ? dot : path.length;
  const named = (extra: string) => `${path.slice(0, cut)} (Drive ${day})${extra}${path.slice(cut)}`;
  let free = named("");
  for (let number = 2; await readLocal(book, free); number++) free = named(` ${number}`);
  return free;
}
