import type { FileSystem } from "./fileSystem.js";

interface Disk {
  files: Map<string, { text: string; modifiedAt: number }>;
  folders: Set<string>;
}

const missing = (path: string) =>
  Object.assign(new Error(`No such file: ${path}`), { code: "ENOENT" });

function addFolderWithParents(disk: Disk, dir: string) {
  for (let end = dir.length; end > 0; end = dir.lastIndexOf("/", end - 1)) {
    disk.folders.add(dir.slice(0, end));
  }
}

function store(disk: Disk, path: string, text: string) {
  disk.files.set(path, { text, modifiedAt: Date.now() });
  addFolderWithParents(disk, path.slice(0, path.lastIndexOf("/")));
}

function childNames(disk: Disk, dir: string): string[] {
  const prefix = `${dir}/`;
  const children = [...disk.files.keys(), ...disk.folders]
    .filter((path) => path.startsWith(prefix) && !path.slice(prefix.length).includes("/"))
    .map((path) => path.slice(prefix.length));
  return [...new Set(children)];
}

function renameFile(disk: Disk, from: string, to: string) {
  const file = disk.files.get(from);
  if (!file) throw missing(from);
  disk.files.delete(from);
  store(disk, to, file.text);
}

/** A disk in memory, used when Penna runs in a plain browser without Tauri. */
export function createMemoryFileSystem(initialFiles: Record<string, string>): FileSystem {
  const disk: Disk = { files: new Map(), folders: new Set() };
  Object.entries(initialFiles).forEach(([path, text]) => store(disk, path, text));
  return {
    readText: async (path) => disk.files.get(path)?.text ?? Promise.reject(missing(path)),
    writeText: async (path, text) => store(disk, path, text),
    rename: async (from, to) => renameFile(disk, from, to),
    list: async (dir) => childNames(disk, dir),
    modifiedAt: async (path) => disk.files.get(path)?.modifiedAt ?? null,
    makeDir: async (dir) => addFolderWithParents(disk, dir),
  };
}
