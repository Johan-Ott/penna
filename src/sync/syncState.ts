import { writeAtomic } from "../storage/atomicWrite.js";
import { joinPath, type FileSystem } from "../storage/fileSystem.js";
import type { Drive } from "./drive.js";

// Which Drive folder a book syncs with, and each file as it was at the last sync;
// project.json keeps its whole text for the merge.
export interface Synced {
  id: string;
  version: string;
  hash: string;
  text?: string;
}
export interface SyncState {
  /** The folder synced, so a copy of the book elsewhere starts afresh instead of sharing this. */
  dir?: string;
  folderId: string | null;
  files: Record<string, Synced>;
}

export const STATE_FILE = ".penna-sync.json";

export async function readState(fileSystem: FileSystem, dir: string): Promise<SyncState> {
  const fresh = { folderId: null, files: {} };
  try {
    const state = JSON.parse(await fileSystem.readText(joinPath(dir, STATE_FILE))) as SyncState;
    return state.dir && state.dir !== dir ? fresh : state;
  } catch {
    return fresh;
  }
}

export const writeState = (fileSystem: FileSystem, dir: string, state: SyncState) =>
  writeAtomic(fileSystem, joinPath(dir, STATE_FILE), `${JSON.stringify(state, null, 2)}\n`);

// Scene ids are random, so two books with scenes but none in common are not the same book.
async function isSameBook(drive: Drive, folderId: string, localScenes: string[]) {
  const scenesId = await drive.findFolder("scenes", folderId);
  const remote = scenesId ? (await drive.list(scenesId)).map((file) => `scenes/${file.name}`) : [];
  return !remote.length || !localScenes.length || remote.some((path) => localScenes.includes(path));
}

// Penna/<book folder> in My Drive, made the first time; another book of the same name is left
// alone and this one gets "<name> (2)".
export async function bookFolder(
  drive: Drive,
  dir: string,
  state: SyncState,
  localScenes: string[],
) {
  if (state.folderId) return state.folderId;
  const penna =
    (await drive.findFolder("Penna", null)) ?? (await drive.createFolder("Penna", null));
  const name = dir.slice(dir.lastIndexOf("/") + 1);
  for (let number = 1; ; number++) {
    const candidate = number === 1 ? name : `${name} (${number})`;
    const found = await drive.findFolder(candidate, penna);
    if (!found) return drive.createFolder(candidate, penna);
    if (await isSameBook(drive, found, localScenes)) return found;
  }
}
