import {
  exists,
  mkdir,
  readDir,
  readTextFile,
  rename,
  stat,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import type { FileSystem } from "./fileSystem.js";

export const tauriFileSystem: FileSystem = {
  readText: (path) => readTextFile(path),
  writeText: (path, text) => writeTextFile(path, text),
  rename: (from, to) => rename(from, to),
  makeDir: (dir) => mkdir(dir, { recursive: true }),

  async list(dir) {
    if (!(await exists(dir))) return [];
    return (await readDir(dir)).map((entry) => entry.name);
  },

  async modifiedAt(path) {
    if (!(await exists(path))) return null;
    return (await stat(path)).mtime?.getTime() ?? null;
  },
};
