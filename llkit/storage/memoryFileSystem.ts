import type { FileSystem } from "./fileSystem.js";

type Content = string | Uint8Array;

interface Disk {
  files: Map<string, { content: Content; modifiedAt: number }>;
  folders: Set<string>;
}

const missing = (path: string) =>
  Object.assign(new Error(`No such file: ${path}`), { code: "ENOENT" });

function addFolderWithParents(disk: Disk, dir: string) {
  for (let end = dir.length; end > 0; end = dir.lastIndexOf("/", end - 1)) {
    disk.folders.add(dir.slice(0, end));
  }
}

function store(disk: Disk, path: string, content: Content) {
  disk.files.set(path, { content, modifiedAt: Date.now() });
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
  store(disk, to, file.content);
}

function read(disk: Disk, path: string): Content {
  const file = disk.files.get(path);
  if (!file) throw missing(path);
  return file.content;
}

const asText = (content: Content) =>
  typeof content === "string" ? content : new TextDecoder().decode(content);
const asBytes = (content: Content) =>
  typeof content === "string" ? new TextEncoder().encode(content) : content.slice();

/** Used when Penna runs in a plain browser without Tauri. */
export function createMemoryFileSystem(initialFiles: Record<string, string>): FileSystem {
  const disk: Disk = { files: new Map(), folders: new Set() };
  Object.entries(initialFiles).forEach(([path, text]) => store(disk, path, text));
  return {
    readText: async (path) => asText(read(disk, path)),
    writeText: async (path, text) => store(disk, path, text),
    readBytes: async (path) => asBytes(read(disk, path)),
    writeBytes: async (path, bytes) => store(disk, path, bytes.slice()),
    rename: async (from, to) => renameFile(disk, from, to),
    list: async (dir) => childNames(disk, dir),
    modifiedAt: async (path) => disk.files.get(path)?.modifiedAt ?? null,
    makeDir: async (dir) => addFolderWithParents(disk, dir),
  };
}
