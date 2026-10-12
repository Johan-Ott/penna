import {
  exists,
  mkdir,
  readDir,
  readFile,
  readTextFile,
  rename,
  stat,
  writeFile,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";
import type { FileSystem } from "./fileSystem.js";

export const tauriFileSystem: FileSystem = {
  readText: (path) => readTextFile(path),
  // A temp file goes all the way to the disk before writeAtomic renames it over the real file.
  writeText: (path, text) =>
    path.endsWith(".penna-tmp")
      ? invoke("write_temp_text", { path, text })
      : writeTextFile(path, text),
  readBytes: (path) => readFile(path),
  writeBytes: (path, bytes) => writeFile(path, bytes),
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
