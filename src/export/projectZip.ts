import JSZip from "jszip";
import { joinPath, type FileSystem } from "../storage/fileSystem.js";

// A folder cannot be read as a file, so whatever fails to read is listed and walked into.
async function addFolder(fileSystem: FileSystem, zip: JSZip, dir: string, zipDir: string) {
  for (const name of await fileSystem.list(dir)) {
    const path = joinPath(dir, name);
    const bytes = await fileSystem.readBytes(path).catch(() => null);
    if (bytes) zip.file(`${zipDir}/${name}`, bytes);
    else await addFolder(fileSystem, zip, path, `${zipDir}/${name}`);
  }
}

/** A book and, when it has one, its series, each under its own name. */
export async function projectZip(fileSystem: FileSystem, dirs: string[]): Promise<Uint8Array> {
  const zip = new JSZip();
  for (const dir of dirs)
    await addFolder(fileSystem, zip, dir, dir.slice(dir.lastIndexOf("/") + 1));
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
