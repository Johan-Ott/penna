import type * as TauriFs from "@tauri-apps/plugin-fs";
import type * as TauriDialog from "@tauri-apps/plugin-dialog";
import type * as TauriWindow from "@tauri-apps/api/window";
import type { FileSystem } from "./fileSystem.js";

// withGlobalTauri in tauri.conf.json puts the plugins on window, so the UI needs no bundler.
declare global {
  interface Window {
    __TAURI__: { fs: typeof TauriFs; dialog: typeof TauriDialog; window: typeof TauriWindow };
  }
}

const tauriFs = () => window.__TAURI__.fs;

export const tauriFileSystem: FileSystem = {
  readText: (path) => tauriFs().readTextFile(path),
  writeText: (path, text) => tauriFs().writeTextFile(path, text),
  rename: (from, to) => tauriFs().rename(from, to),

  async list(dir) {
    if (!(await tauriFs().exists(dir))) return [];
    return (await tauriFs().readDir(dir)).map((entry) => entry.name);
  },

  async modifiedAt(path) {
    if (!(await tauriFs().exists(path))) return null;
    return (await tauriFs().stat(path)).mtime?.getTime() ?? null;
  },
};
