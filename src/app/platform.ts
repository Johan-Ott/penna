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
  /** Asks where to save an export and writes it whole; the saved path, or null if cancelled. */
  saveFile(suggestedName: string, bytes: Uint8Array, kind: FileKind): Promise<string | null>;
  /** Lets the writer pick a JPG or PNG; its bytes, or null if cancelled. */
  pickImage(): Promise<Uint8Array | null>;
}

/** What the save dialog offers, for example { name: "Word", extension: "docx" }. */
export interface FileKind {
  name: string;
  extension: string;
}

export const platform: Platform = isTauri() ? tauriPlatform : browserPlatform;
