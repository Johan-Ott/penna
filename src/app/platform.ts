import { isTauri } from "@tauri-apps/api/core";
import type { FileSystem } from "../storage/fileSystem.js";
import { browserPlatform } from "./browserPlatform.js";
import { tauriPlatform } from "./tauriPlatform.js";

export interface Platform {
  fileSystem: FileSystem;
  pickFolder(): Promise<string | null>;
  /** The home and Documents folders, with forward slashes. */
  knownFolders(): Promise<{ home: string; documents: string }>;
  folderExists(path: string): Promise<boolean>;
  watchFolder(dir: string, onChange: () => void): Promise<() => void>;
  /** `isSafeToClose` saves first; when it fails, the writer is asked before the window closes. */
  guardClose(isSafeToClose: () => Promise<boolean>): () => void;
}

export const platform: Platform = isTauri() ? tauriPlatform : browserPlatform;
