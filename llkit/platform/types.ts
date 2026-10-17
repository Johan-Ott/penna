import type { FileSystem } from "../storage/fileSystem.js";

// The device as an app sees it: files, folders, dialogs, the clipboard, notices, updates and the
// window. llkit has one for Tauri and one for the browser; the app picks and adds to it.

/** A frameless window's own buttons, in the app's top bar. */
export interface WindowControls {
  minimize: () => void;
  toggleMaximize: () => void;
  close: () => void;
}

/** What every app needs of the device it runs on; an app adds its own parts to it. */
export interface BasePlatform {
  /** A phone: files in the app's own folder, no keyboard shortcuts, no folder to pick. */
  isPhone: boolean;
  /** A web page in the system's browser, outside the app. */
  openLink(url: string): Promise<void>;
  /** On a computer, where the app's window has no frame of its own. */
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
  /** The phone's own alarm for a reminder, which fires while the app is closed; null cancels it. */
  scheduleReminder?: (when: Date | null, title: string, body: string) => Promise<void>;
  /** Reaches the web outside the app's own rules, for feedback. */
  webFetch: typeof fetch;
  /** For the text's own menu; missing on a phone, where the system's menu is kept. */
  readClipboard?: () => Promise<string>;
  /** Opens a file in the program the computer uses for it; missing where there is none. */
  openFile?: (path: string) => Promise<void>;
  /** Android's share sheet, for a picture or an export; missing elsewhere. */
  shareFile?: (name: string, bytes: Uint8Array, mime: string) => Promise<void>;
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
