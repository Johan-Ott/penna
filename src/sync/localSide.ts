import { takeSnapshot } from "../project/snapshots.js";
import { joinPath, type FileSystem } from "../storage/fileSystem.js";

export interface LocalBook {
  fileSystem: FileSystem;
  dir: string;
}

// Written beside and renamed, so a half-downloaded file never replaces a whole one.
export async function writeLocal(book: LocalBook, path: string, bytes: Uint8Array) {
  const target = joinPath(book.dir, path);
  await book.fileSystem.makeDir(target.slice(0, target.lastIndexOf("/")));
  await book.fileSystem.writeBytes(`${target}.penna-tmp`, bytes);
  await book.fileSystem.rename(`${target}.penna-tmp`, target);
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
}

const SCENE_PATH = /^scenes\/([^/]+)\.md$/;

export async function keepVersion(book: LocalBook, path: string, bytes: Uint8Array, now: number) {
  const id = SCENE_PATH.exec(path)?.[1];
  if (!id) return;
  const text = new TextDecoder().decode(bytes);
  await takeSnapshot(book.fileSystem, { dir: book.dir, id }, text, { time: now });
}
