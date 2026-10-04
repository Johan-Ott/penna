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
  /** Lets the writer pick a file of the given kinds; its path and bytes, or null if cancelled. */
  pickFile(kind: PickKind): Promise<PickedFile | null>;
  /** Spellcheck in the book's language; in the app the window restarts when it changes. */
  setSpellLanguage(language: string): Promise<void>;
  /** A newer signed release of Penna, or null when this is the newest or nothing could be asked. */
  checkForUpdate(): Promise<AppUpdate | null>;
  /** Shows a saved file in Explorer or Finder; missing where there is no file manager. */
  showInFolder?: (path: string) => Promise<void>;
  /** A system notice, as for the daily reminder; asks for permission the first time. */
  notify(title: string, body: string): Promise<void>;
}

export interface AppUpdate {
  version: string;
  /** Downloads, installs and restarts into the new version. */
  install(): Promise<void>;
}

/** What the open dialog offers, for example { name: "Bild", extensions: ["jpg", "png"] }. */
export interface PickKind {
  name: string;
  extensions: string[];
}

/** In the browser the path is only the file's name. */
export interface PickedFile {
  path: string;
  bytes: Uint8Array;
}

/** What the save dialog offers, for example { name: "Word", extension: "docx" }. */
export interface FileKind {
  name: string;
  extension: string;
}

export const platform: Platform = isTauri() ? tauriPlatform : browserPlatform;
