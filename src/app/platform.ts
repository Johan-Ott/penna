import { isTauri } from "@tauri-apps/api/core";
import type { FileSystem } from "@llkit/storage/fileSystem.js";
import { browserPlatform } from "./browserPlatform.js";
import { tauriPlatform } from "./tauriPlatform.js";

export interface RemoteState {
  isOpen: boolean;
  isNext: boolean;
}

/** A frameless window's own buttons, in Penna's top bar. */
export interface WindowControls {
  minimize: () => void;
  toggleMaximize: () => void;
  close: () => void;
}

export interface Platform {
  /** A phone: books in the app's own folder, no keyboard shortcuts, no folder to pick. */
  isPhone: boolean;
  /** Tools on this computer may drive Penna for the next start only; open is this start. */
  remoteControl?: (turnOn?: boolean) => Promise<RemoteState>;
  /** A web page in the system's browser, outside Penna. */
  openLink(url: string): Promise<void>;
  /** On a computer, where Penna's window has no frame of its own. */
  windowControls?: WindowControls;
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
  /** The phone's own alarm for the reminder, which fires while Penna is closed; null cancels it. */
  scheduleReminder?: (when: Date | null, title: string, body: string) => Promise<void>;
  /** Missing where Penna cannot sign in: the browser, and iPad for now. */
  googleSignIn?: GoogleSignIn;
  /** Asks first; true when the book was removed. Missing in the browser version. */
  /** `isEverywhere`: the question says the copy in Drive goes too; the caller removes it. */
  removeBook?: (dir: string, title: string, isEverywhere?: boolean) => Promise<boolean>;
  /** Reaches the web outside the app's own rules, for feedback. */
  webFetch: typeof fetch;
  /** Copies of every book in Penna's own folder. Missing in the browser version. */
  backups?: Backups;
  /** For the text's own menu; missing on a phone, where the system's menu is kept. */
  readClipboard?: () => Promise<string>;
  /** Penna's own spelling check; missing in the browser, which checks the spelling itself. */
  spelling?: Spelling;
  /** Opens a file in the program the computer uses for it; missing where there is none. */
  openFile?: (path: string) => Promise<void>;
  /** Android's share sheet, for a picture or an export; missing elsewhere. */
  shareFile?: (name: string, bytes: Uint8Array, mime: string) => Promise<void>;
  /** Typst's compiler, fetched once by the apps; missing in the browser, where it comes along. */
  typstCompiler?: () => Promise<ArrayBuffer>;
  /** Fetches the compiler now, as the first start does; missing in the browser. */
  prepareTypst?: () => Promise<void>;
  /** What has been fetched: the dictionaries' languages and the compiler; missing in the browser. */
  fetchedParts?: () => Promise<{ dictionaries: string[]; hasTypst: boolean }>;
}

export interface Spelling {
  /** The words the language's dictionary does not know; fails when there is no dictionary. */
  misspelled(language: string, words: string[]): Promise<string[]>;
  /** Every language's dictionary is fetched the first time it is needed, then kept. */
  suggestions(language: string, word: string): Promise<string[]>;
  /** Fetches the language's dictionary now, as the first start does for the chosen ones. */
  prepare(language: string): Promise<void>;
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
  /** A phone's update is a file Android installs, not a restart. */
  isDownload?: boolean;
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
