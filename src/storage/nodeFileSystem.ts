import { mkdir, readdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import type { FileSystem } from "./fileSystem.js";

const isMissing = (error: unknown) => (error as NodeJS.ErrnoException).code === "ENOENT";

export const nodeFileSystem: FileSystem = {
  readText: (path) => readFile(path, "utf8"),
  writeText: (path, text) => writeFile(path, text, "utf8"),
  readBytes: async (path) => new Uint8Array(await readFile(path)),
  writeBytes: (path, bytes) => writeFile(path, bytes),
  rename: (from, to) => rename(from, to),
  makeDir: async (dir) => void (await mkdir(dir, { recursive: true })),

  async list(dir) {
    try {
      return await readdir(dir);
    } catch (error) {
      if (isMissing(error)) return [];
      throw error;
    }
  },

  async modifiedAt(path) {
    try {
      return (await stat(path)).mtimeMs;
    } catch (error) {
      if (isMissing(error)) return null;
      throw error;
    }
  },
};
