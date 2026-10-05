import { joinPath, type FileSystem } from "../storage/fileSystem.js";
import type { Drive, RemoteFile } from "./drive.js";

/** What a sync did: paths inside the book folder, such as "scenes/S1.md". */
export interface SyncResult {
  uploaded: string[];
  downloaded: string[];
  conflicts: string[];
}

// How each file looked when it was last in step with Drive, kept beside the book.
interface Synced {
  id: string;
  version: string;
  hash: string;
}
interface SyncState {
  folderId: string | null;
  files: Record<string, Synced>;
}

const STATE_FILE = ".penna-sync.json";
const isLeftOut = (path: string) => path === STATE_FILE || path.endsWith(".penna-tmp");

async function hashOf(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-1", bytes as BufferSource);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function readState(fileSystem: FileSystem, dir: string): Promise<SyncState> {
  try {
    return JSON.parse(await fileSystem.readText(joinPath(dir, STATE_FILE))) as SyncState;
  } catch {
    return { folderId: null, files: {} };
  }
}

// A folder cannot be read as a file, so whatever fails to read is walked into.
async function localFiles(fileSystem: FileSystem, dir: string, prefix = "") {
  const found = new Map<string, Uint8Array>();
  for (const name of await fileSystem.list(dir)) {
    const path = prefix ? `${prefix}/${name}` : name;
    const bytes = await fileSystem.readBytes(joinPath(dir, name)).catch(() => null);
    if (bytes && !isLeftOut(path)) found.set(path, bytes);
    if (!bytes) {
      for (const [inner, content] of await localFiles(fileSystem, joinPath(dir, name), path)) {
        found.set(inner, content);
      }
    }
  }
  return found;
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

// The book's folder is Penna/<book folder> in My Drive, made the first time.
async function bookFolder(drive: Drive, dir: string, state: SyncState) {
  if (state.folderId) return state.folderId;
  const penna =
    (await drive.findFolder("Penna", null)) ?? (await drive.createFolder("Penna", null));
  const name = dir.slice(dir.lastIndexOf("/") + 1);
  return (await drive.findFolder(name, penna)) ?? (await drive.createFolder(name, penna));
}

/** "scenes/S1.md" becomes "scenes/S1 (Drive 2026-10-04).md": Drive's side of a conflict. */
export function conflictCopyPath(path: string, now: number) {
  const day = new Date(now).toISOString().slice(0, 10);
  const dot = path.lastIndexOf(".");
  const cut = dot > path.lastIndexOf("/") ? dot : path.length;
  return `${path.slice(0, cut)} (Drive ${day})${path.slice(cut)}`;
}

interface Run {
  fileSystem: FileSystem;
  drive: Drive;
  dir: string;
  now: number;
  rootId: string;
  remote: RemoteTree;
  state: SyncState;
  result: SyncResult;
}

// The Drive folder a path goes in, made one level at a time where it is missing.
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

// Written beside and renamed, so a half-downloaded file never replaces a whole one.
async function writeLocal(run: Run, path: string, bytes: Uint8Array) {
  const target = joinPath(run.dir, path);
  await run.fileSystem.makeDir(target.slice(0, target.lastIndexOf("/")));
  await run.fileSystem.writeBytes(`${target}.penna-tmp`, bytes);
  await run.fileSystem.rename(`${target}.penna-tmp`, target);
}

async function send(run: Run, path: string, bytes: Uint8Array, remote: RemoteFile | undefined) {
  const name = path.slice(path.lastIndexOf("/") + 1);
  const sent = remote
    ? await run.drive.update(remote.id, bytes)
    : await run.drive.upload(name, await folderFor(run, path), bytes);
  run.state.files[path] = { id: sent.id, version: sent.version, hash: await hashOf(bytes) };
  run.result.uploaded.push(path);
}

async function fetchFile(run: Run, path: string, remote: RemoteFile, bytes?: Uint8Array) {
  const content = bytes ?? (await run.drive.download(remote.id));
  await writeLocal(run, path, content);
  run.state.files[path] = { id: remote.id, version: remote.version, hash: await hashOf(content) };
  run.result.downloaded.push(path);
}

// Both sides have the file and at least one changed it since the last sync.
async function settle(run: Run, path: string, local: Uint8Array, remote: RemoteFile) {
  const base = run.state.files[path];
  const localHash = await hashOf(local);
  const isLocalChanged = base?.hash !== localHash;
  if (base && isLocalChanged && base.version === remote.version)
    return send(run, path, local, remote);
  const remoteBytes = await run.drive.download(remote.id);
  if ((await hashOf(remoteBytes)) === localHash) {
    run.state.files[path] = { id: remote.id, version: remote.version, hash: localHash };
    return;
  }
  if (base && !isLocalChanged) return fetchFile(run, path, remote, remoteBytes);
  await writeLocal(run, conflictCopyPath(path, run.now), remoteBytes);
  run.result.conflicts.push(path);
  return send(run, path, local, remote);
}

// Unchanged on both sides since the last sync: nothing to send or fetch.
async function isInStep(run: Run, path: string, local: Uint8Array, remote: RemoteFile) {
  const base = run.state.files[path];
  return base?.version === remote.version && base.hash === (await hashOf(local));
}

async function syncFile(run: Run, path: string, local: Uint8Array | undefined) {
  const remote = run.remote.files.get(path);
  if (!remote) return local && send(run, path, local, undefined);
  if (!local) return fetchFile(run, path, remote);
  if (!(await isInStep(run, path, local, remote))) await settle(run, path, local, remote);
}

/**
 * Brings a book folder and its folder in Drive in step. Nothing is deleted on either side; when
 * both changed a file, this device's text stays and Drive's is kept beside it as a copy.
 */
export async function syncProject(fileSystem: FileSystem, drive: Drive, dir: string, now: number) {
  const state = await readState(fileSystem, dir);
  const rootId = await bookFolder(drive, dir, state);
  const remote: RemoteTree = { files: new Map(), folders: new Map() };
  await remoteFiles(drive, rootId, "", remote);
  const local = await localFiles(fileSystem, dir);
  const result: SyncResult = { uploaded: [], downloaded: [], conflicts: [] };
  const run: Run = { fileSystem, drive, dir, now, rootId, remote, state, result };
  for (const path of new Set([...local.keys(), ...remote.files.keys()])) {
    if (!isLeftOut(path)) await syncFile(run, path, local.get(path));
  }
  await fileSystem.makeDir(dir);
  const saved: SyncState = { folderId: rootId, files: state.files };
  await fileSystem.writeText(joinPath(dir, STATE_FILE), `${JSON.stringify(saved, null, 2)}\n`);
  return result;
}
