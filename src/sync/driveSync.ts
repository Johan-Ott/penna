import type { FileSystem } from "@llkit/storage/fileSystem.js";
import { isTempFile } from "@llkit/storage/atomicWrite.js";
import type { Drive, RemoteFile } from "./drive.js";
import { filesIn } from "../storage/folderFiles.js";
import {
  conflictCopyPath,
  DOWNLOAD_SUFFIX,
  hashOf,
  keepVersion,
  moveToTrash,
  readLocal,
  replaceLocal,
  writeLocal,
  type LocalBook,
  type WriteGuard,
} from "./localSide.js";
import { mergeProjectText } from "./mergeProject.js";
import {
  bookFolder,
  checkFewGone,
  readState,
  STATE_FILE,
  writeState,
  type Synced,
  type SyncState,
} from "./syncState.js";
import { addToSyncLog, SYNC_LOG, syncLogger, type SyncLogger } from "./syncLog.js";
import { remoteTree, type RemoteTree } from "./remoteTree.js";

/** Paths inside the book folder, such as "scenes/S1.md". */
interface SyncResult {
  uploaded: string[];
  downloaded: string[];
  conflicts: string[];
  /** Removed on the other side, and so moved to the trash on this one. */
  trashed: string[];
}

const MERGED = "project.json";
// A conflict copy stays on the device where it was made, so resolving it is not undone by a sync.
const CONFLICT_COPY = / \(Drive \d{4}-\d\d-\d\d\)/;
const isLeftOut = (path: string) =>
  path === STATE_FILE ||
  path === SYNC_LOG ||
  isTempFile(path) ||
  path.endsWith(DOWNLOAD_SUFFIX) ||
  CONFLICT_COPY.test(path);

interface Run {
  book: LocalBook;
  drive: Drive;
  now: number;
  rootId: string;
  remote: RemoteTree;
  state: SyncState;
  result: SyncResult;
  logger: SyncLogger;
}

// Made one level at a time where missing.
async function folderFor(run: Run, path: string): Promise<string> {
  const parent = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
  if (!parent) return run.rootId;
  const known = run.remote.folders.get(parent);
  if (known) return known;
  const above = await folderFor(run, parent);
  const id = await run.drive.createFolder(parent.slice(parent.lastIndexOf("/") + 1), above);
  run.remote.folders.set(parent, id);
  return id;
}

async function remember(run: Run, path: string, remote: RemoteFile, bytes: Uint8Array) {
  const synced: Synced = { id: remote.id, version: remote.version, hash: await hashOf(bytes) };
  if (path === MERGED) synced.text = new TextDecoder().decode(bytes);
  run.state.files[path] = synced;
}

async function send(run: Run, path: string, bytes: Uint8Array, remote: RemoteFile | undefined) {
  const name = path.slice(path.lastIndexOf("/") + 1);
  const sent = remote
    ? await run.drive.update(remote.id, bytes, remote.version)
    : await run.drive.upload(name, await folderFor(run, path), bytes);
  await remember(run, path, sent, bytes);
  run.result.uploaded.push(path);
}

async function fetchFile(run: Run, path: string, drive: DriveSide, local?: Uint8Array) {
  const { remote, remoteBytes } = drive;
  const content = remoteBytes ?? (await run.drive.download(remote.id));
  if (!(await replaceLocal(run.book, path, local, content))) return;
  run.logger.written(path, local, content);
  await remember(run, path, remote, content);
  run.result.downloaded.push(path);
}

interface DriveSide {
  remote: RemoteFile;
  remoteBytes?: Uint8Array;
}

// project.json as both sides last agreed, which a merge compares with; a duplicate grew apart
// from it, so it has none, and neither side's chapters are dropped.
interface Merging {
  base: string | null;
}

// project.json is merged; any other file keeps this device's text and Drive's goes beside it.
async function keepBoth(
  run: Run,
  path: string,
  local: Uint8Array,
  drive: Required<DriveSide> & Partial<Merging>,
) {
  const { remote, remoteBytes } = drive;
  if (path !== MERGED) {
    await writeLocal(run.book, await conflictCopyPath(run.book, path, run.now), remoteBytes);
    run.result.conflicts.push(path);
    return send(run, path, local, remote);
  }
  const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);
  const base = drive.base === undefined ? (run.state.files[MERGED]?.text ?? null) : drive.base;
  const { text, conflicts } = mergeProjectText(base, decode(local), decode(remoteBytes));
  const merged = new TextEncoder().encode(text);
  if (!(await replaceLocal(run.book, MERGED, local, merged))) return;
  run.logger.written(MERGED, local, merged, conflicts);
  run.result.downloaded.push(MERGED);
  return send(run, MERGED, merged, remote);
}

async function settle(run: Run, path: string, local: Uint8Array, remote: RemoteFile) {
  const base = run.state.files[path];
  const localHash = await hashOf(local);
  const isLocalChanged = base?.hash !== localHash;
  if (base && isLocalChanged && base.version === remote.version)
    return send(run, path, local, remote);
  const remoteBytes = await run.drive.download(remote.id);
  if ((await hashOf(remoteBytes)) === localHash) return remember(run, path, remote, local);
  if (base && !isLocalChanged) {
    await keepVersion(run.book, path, local, run.now);
    return fetchFile(run, path, { remote, remoteBytes }, local);
  }
  return keepBoth(run, path, local, { remote, remoteBytes });
}

async function isInStep(run: Run, path: string, local: Uint8Array, remote: RemoteFile) {
  const base = run.state.files[path];
  return base?.version === remote.version && base.hash === (await hashOf(local));
}

// Gone on one side since the last sync means removed there, unless the other side changed it since.
async function trashRemoved(run: Run, path: string, local: Uint8Array | undefined) {
  const remote = run.remote.files.get(path);
  const base = run.state.files[path];
  if (!base || (local && remote)) return false;
  if (remote && base.version === remote.version) await run.drive.trash(remote.id);
  else if (local && base.hash === (await hashOf(local)))
    run.logger.trashed(path, local, await moveToTrash(run.book, path));
  else return false;
  const kept = Object.entries(run.state.files).filter(([known]) => known !== path);
  run.state.files = Object.fromEntries(kept);
  run.result.trashed.push(path);
  return true;
}

async function syncFile(run: Run, path: string, local: Uint8Array | undefined) {
  if (await trashRemoved(run, path, local)) return;
  const remote = run.remote.files.get(path);
  if (!remote) return local && send(run, path, local, undefined);
  if (!local) return fetchFile(run, path, { remote });
  if (!(await isInStep(run, path, local, remote))) await settle(run, path, local, remote);
}

// A second file at a path is settled like a change from another device, then goes to Drive's
// trash, where it can be restored for 30 days.
async function settleDuplicates(run: Run) {
  for (const [path, duplicate] of run.remote.duplicates) {
    const known = run.state.files[path];
    const local = await readLocal(run.book, path);
    if (!known || !local) continue;
    const remoteBytes = await run.drive.download(duplicate.id);
    const remote = { ...duplicate, id: known.id, version: known.version };
    if ((await hashOf(remoteBytes)) !== (await hashOf(local)))
      await keepBoth(run, path, local, { remote, remoteBytes, base: null });
    await run.drive.trash(duplicate.id);
  }
}

// Each file is read again just before its turn, so text saved during the sync is what counts.
async function syncEach(run: Run, all: string[], onProgress?: (done: number, all: number) => void) {
  const paths = all.filter((path) => !isLeftOut(path));
  for (const [index, path] of paths.entries()) {
    await syncFile(run, path, await readLocal(run.book, path));
    onProgress?.(index + 1, paths.length);
  }
}

/** The guard wraps each write over a file here, so the app can keep the open scene safe. */
export async function syncProject(
  fileSystem: FileSystem,
  drive: Drive,
  dir: string,
  options: { now: number; guard?: WriteGuard; onProgress?: (done: number, all: number) => void },
) {
  const { now, guard = (_path, write) => write() } = options;
  const state = await readState(fileSystem, dir);
  const local = await filesIn(fileSystem, dir);
  const localScenes = [...local.keys()].filter((path) => path.startsWith("scenes/"));
  const rootId = await bookFolder(drive, dir, state, localScenes);
  // A book going up for the first time says so at once, so the shelf never takes its new folder
  // in Drive for a book to fetch. A fetch starts empty and gets its state when done.
  if (!state.folderId && local.size > 0)
    await writeState(fileSystem, dir, { dir, folderId: rootId, files: state.files });
  const remote = await remoteTree(drive, rootId, (path) => state.files[path]?.id);
  checkFewGone(state, local, remote.files);
  const book = { fileSystem, dir, guard };
  const result: SyncResult = { uploaded: [], downloaded: [], conflicts: [], trashed: [] };
  const logger = syncLogger();
  const run: Run = { book, drive, now, rootId, remote, state, result, logger };
  await syncEach(run, [...new Set([...local.keys(), ...remote.files.keys()])], options.onProgress);
  await settleDuplicates(run);
  await fileSystem.makeDir(dir);
  const saved: SyncState = { dir, folderId: rootId, files: state.files };
  await writeState(fileSystem, dir, saved);
  await addToSyncLog(fileSystem, dir, logger.log);
  return result;
}
