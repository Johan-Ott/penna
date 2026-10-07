import { isTauri } from "@tauri-apps/api/core";
import type { FileSystem } from "../storage/fileSystem.js";
import { browserPlatform } from "./browserPlatform.js";
import { tauriPlatform } from "./tauriPlatform.js";

export interface Platform {
  /** A phone: books in the app's own folder, no keyboard shortcuts, no folder to pick. */
  isPhone: boolean;
  fileSystem: FileSystem;
  pickFolder(): Promise<string | null>;
  /** With forward slashes. */
  knownFolders(): Promise<{ home: string; documents: string }>;
  folderExists(path: string): Promise<boolean>;
  /** `onChange` gets the paths that changed, or none when the system does not say. */
  watchFolder(dir: string, onChange: (changed?: string[]) => void): Promise<() => void>;
  /** `isSafeToClose` saves first; when it fails, the writer is asked before the window closes. */
  guardClose(isSafeToClose: () => Promise<boolean>): () => void;
  /** The saved path, or null if cancelled. */
  saveFile(suggestedName: string, bytes: Uint8Array, kind: FileKind): Promise<string | null>;
  /** Its path and bytes, or null if cancelled. */
  pickFile(kind: PickKind): Promise<PickedFile | null>;
  /** Null when this is the newest, or when nothing could be asked. */
  checkForUpdate(): Promise<AppUpdate | null>;
  /** Missing where there is no file manager. */
  showInFolder?: (path: string) => Promise<void>;
  /** Asks for permission the first time. */
  notify(title: string, body: string): Promise<void>;
  /** Missing where Penna cannot sign in: the browser, and iPad for now. */
  googleSignIn?: GoogleSignIn;
  /** Asks first; true when the book was removed. Missing in the browser version. */
  removeBook?: (dir: string, title: string) => Promise<boolean>;
  /** Reaches the web outside the app's own rules, for feedback. */
  webFetch: typeof fetch;
  /** Copies of every book in Penna's own folder. Missing in the browser version. */
  backups?: Backups;
  /** For the text's own menu; missing on a phone, where the system's menu is kept. */
  readClipboard?: () => Promise<string>;
  /** Penna's own spelling check; missing in the browser, which checks the spelling itself. */
  spelling?: Spelling;
}

export interface Spelling {
  /** The words the language's dictionary does not know; fails when there is no dictionary. */
  misspelled(language: string, words: string[]): Promise<string[]>;
  /** A language that is not built in is fetched the first time, then kept. */
  suggestions(language: string, word: string): Promise<string[]>;
}

export interface Backups {
  /** With forward slashes. */
  dir(): Promise<string>;
  /** Removes one old copy; refuses anything outside the copies' folder. */
  remove(path: string): Promise<void>;
}

export interface GoogleSignIn {
  /** Shows Google's account choice and consent. */
  connect(): Promise<void>;
  /** Never asks; fails when the writer must connect again. */
  accessToken(): Promise<string>;
  disconnect(): Promise<void>;
  /** Not stopped by the browser's cross-site rules. */
  fetch: typeof fetch;
}

export interface AppUpdate {
  version: string;
  install(): Promise<void>;
}

export interface PickKind {
  name: string;
  extensions: string[];
}

/** In the browser the path is only the file's name. */
export interface PickedFile {
  path: string;
  bytes: Uint8Array;
}

export interface FileKind {
  name: string;
  extension: string;
}

export const platform: Platform = isTauri() ? tauriPlatform : browserPlatform;
