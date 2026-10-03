import { isTauri } from "@tauri-apps/api/core";
import type { FileSystem } from "../storage/fileSystem.js";
import { browserPlatform } from "./browserPlatform.js";
import { tauriPlatform } from "./tauriPlatform.js";

export interface Platform {
  fileSystem: FileSystem;
  /** True in a plain browser, where Penna shows the example project from memory. */
  isDemo: boolean;
  pickFolder(): Promise<string | null>;
  watchFolder(dir: string, onChange: () => void): Promise<() => void>;
  /** `isSafeToClose` saves first; when it fails, the writer is asked before the window closes. */
  guardClose(isSafeToClose: () => Promise<boolean>): () => void;
}

export const platform: Platform = isTauri() ? tauriPlatform : browserPlatform;
