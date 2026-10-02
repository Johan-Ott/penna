// The same storage logic runs on Node in tests and on Tauri in the app.
export interface FileSystem {
  readText(path: string): Promise<string>;
  writeText(path: string, text: string): Promise<void>;
  /** Replaces `to` if it exists. */
  rename(from: string, to: string): Promise<void>;
  /** File names in `dir`, or an empty list when the folder is missing. */
  list(dir: string): Promise<string[]>;
  /** Milliseconds since 1970, or null when the file is missing. */
  modifiedAt(path: string): Promise<number | null>;
}

// Forward slashes work on Windows in both Node and Tauri.
export function joinPath(dir: string, name: string): string {
  return `${dir}/${name}`;
}
