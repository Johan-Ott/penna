// Node in tests, Tauri in the app, memory in a browser.
export interface FileSystem {
  readText(path: string): Promise<string>;
  writeText(path: string, text: string): Promise<void>;
  readBytes(path: string): Promise<Uint8Array>;
  writeBytes(path: string, bytes: Uint8Array): Promise<void>;
  /** Replaces `to` if it exists. */
  rename(from: string, to: string): Promise<void>;
  /** File names in `dir`, or an empty list when the folder is missing. */
  list(dir: string): Promise<string[]>;
  /** Milliseconds since 1970, or null when the file is missing. */
  modifiedAt(path: string): Promise<number | null>;
  makeDir(dir: string): Promise<void>;
}

// Forward slashes work on Windows in both Node and Tauri.
export function joinPath(dir: string, name: string): string {
  return `${dir}/${name}`;
}

/** Null only when the file is missing; a file that is there but cannot be read throws. */
export async function readIfThere(fileSystem: FileSystem, path: string) {
  try {
    return await fileSystem.readText(path);
  } catch (error) {
    if ((await fileSystem.modifiedAt(path).catch(() => null)) === null) return null;
    throw error;
  }
}
