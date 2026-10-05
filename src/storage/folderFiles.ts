import { joinPath, type FileSystem } from "./fileSystem.js";

/** Every file under `dir`, by its path inside it, such as "scenes/S1.md". */
export async function filesIn(fileSystem: FileSystem, dir: string, prefix = "") {
  const found = new Map<string, Uint8Array>();
  const folder = prefix ? joinPath(dir, prefix) : dir;
  for (const name of await fileSystem.list(folder)) {
    const path = prefix ? `${prefix}/${name}` : name;
    // A folder cannot be read as a file, so whatever fails to read is walked into.
    const bytes = await fileSystem.readBytes(joinPath(folder, name)).catch(() => null);
    if (bytes) found.set(path, bytes);
    else
      for (const [inner, content] of await filesIn(fileSystem, dir, path))
        found.set(inner, content);
  }
  return found;
}
