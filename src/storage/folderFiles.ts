import { joinPath, type FileSystem } from "@llkit/storage/fileSystem.js";

const NOTHING = new Map<string, Uint8Array>();

/** Every file under `dir`, by its path inside it, such as "scenes/S1.md". A folder's files are
 * read at once rather than one after another: on a phone each read is a trip to the system. */
export async function filesIn(
  fileSystem: FileSystem,
  dir: string,
  prefix = "",
): Promise<Map<string, Uint8Array>> {
  const folder = prefix ? joinPath(dir, prefix) : dir;
  const names = await fileSystem.list(folder);
  const read = await Promise.all(
    names.map(async (name) => {
      const path = prefix ? `${prefix}/${name}` : name;
      // A folder cannot be read as a file, so whatever fails to read is walked into. A locked
      // file is no folder either, and is left out rather than stopping a whole backup.
      const bytes = await fileSystem.readBytes(joinPath(folder, name)).catch(() => null);
      if (bytes) return new Map([[path, bytes]]);
      return filesIn(fileSystem, dir, path).catch(() => NOTHING);
    }),
  );
  return new Map(read.flatMap((files) => [...files]));
}
