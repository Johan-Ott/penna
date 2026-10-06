import { joinPath, type FileSystem } from "../storage/fileSystem.js";
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
import { addToSyncLog, SYNC_LOG, syncLogger, type SyncLogger } from "./syncLog.js";
import { t } from "../i18n/i18n.js";

/** Paths inside the book folder, such as "scenes/S1.md". */
interface SyncResult {
  uploaded: string[];
  downloaded: string[];
  conflicts: string[];
  /** Removed on the other side, and so moved to the trash on this one. */
  trashed: string[];
}

// Each file as it was at the last sync; project.json keeps its whole text for the merge.
interface Synced {
  id: string;
  version: string;
  hash: string;
  text?: string;
}
interface SyncState {
  folderId: string | null;
  files: Record<string, Synced>;
}

const STATE_FILE = ".penna-sync.json";
const MERGED = "project.json";
// A conflict copy stays on the device where it was made, so resolving it is not undone by a sync.
const CONFLICT_COPY = / \(Drive \d{4}-\d\d-\d\d\)/;
const isLeftOut = (path: string) =>
  path === STATE_FILE ||
  path === SYNC_LOG ||
  path.endsWith(".penna-tmp") ||
  path.endsWith(DOWNLOAD_SUFFIX) ||
  CONFLICT_COPY.test(path);

async function readState(fileSystem: FileSystem, dir: string): Promise<SyncState> {
  try {
    return JSON.parse(await fileSystem.readText(joinPath(dir, STATE_FILE))) as SyncState;
  } catch {
    return { folderId: null, files: {} };
  }
}

async function remoteFiles(drive: Drive, folderId: string, prefix: string, tree: RemoteTree) {
  for (const file of await drive.list(folderId)) {
    const path = prefix ? `${prefix}/${file.name}` : file.name;
    if (file.isFolder) {
      tree.folders.set(path, file.id);
      await remoteFiles(drive, file.id, path, tree);
    } else {
      tree.files.set(path, file);
    }
  }
}

interface RemoteTree {
  files: Map<string, RemoteFile>;
  folders: Map<string, string>;
}

// Penna/<book folder> in My Drive, made the first time.
async function bookFolder(drive: Drive, dir: string, state: SyncState) {
  if (state.folderId) return state.folderId;
  const penna =
    (await drive.findFolder("Penna", null)) ?? (await drive.createFolder("Penna", null));
  const name = dir.slice(dir.lastIndexOf("/") + 1);
  return (await drive.findFolder(name, penna)) ?? (await drive.createFolder(name, penna));
}

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
    ? await run.drive.update(remote.id, bytes)
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

// project.json is merged; any other file keeps this device's text and Drive's goes beside it.
async function keepBoth(run: Run, path: string, local: Uint8Array, drive: Required<DriveSide>) {
  const { remote, remoteBytes } = drive;
  if (path !== MERGED) {
    await writeLocal(run.book, await conflictCopyPath(run.book, path, run.now), remoteBytes);
    run.result.conflicts.push(path);
    return send(run, path, local, remote);
  }
  const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);
  const base = run.state.files[MERGED]?.text ?? null;
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

/** The guard wraps each write over a file here, so the app can keep the open scene safe. */
export async function syncProject(
  fileSystem: FileSystem,
  drive: Drive,
  dir: string,
  options: { now: number; guard?: WriteGuard },
) {
  const { now, guard = (_path, write) => write() } = options;
  const state = await readState(fileSystem, dir);
  const rootId = await bookFolder(drive, dir, state);
  const remote: RemoteTree = { files: new Map(), folders: new Map() };
  await remoteFiles(drive, rootId, "", remote);
  // An empty folder after files were synced means it was removed or moved in Drive, not that
  // every file was; trashing them all here would empty the book.
  if (remote.files.size === 0 && Object.keys(state.files).length > 0) {
    throw new Error(t("Bokens mapp i Drive är tom eller borta. Inget har ändrats här."));
  }
  const book = { fileSystem, dir, guard };
  const local = await filesIn(fileSystem, dir);
  const result: SyncResult = { uploaded: [], downloaded: [], conflicts: [], trashed: [] };
  const logger = syncLogger();
  const run: Run = { book, drive, now, rootId, remote, state, result, logger };
  // Each file is read again just before its turn, so text saved during the sync is what counts.
  for (const path of new Set([...local.keys(), ...remote.files.keys()])) {
    if (!isLeftOut(path)) await syncFile(run, path, await readLocal(book, path));
  }
  await fileSystem.makeDir(dir);
  const saved: SyncState = { folderId: rootId, files: state.files };
  await fileSystem.writeText(joinPath(dir, STATE_FILE), `${JSON.stringify(saved, null, 2)}\n`);
  await addToSyncLog(fileSystem, dir, logger.log);
  return result;
}
