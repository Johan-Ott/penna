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

/** The whole project folder as a zip, for a backup or to send with a support question. */
export async function projectZip(fileSystem: FileSystem, dir: string): Promise<Uint8Array> {
  const zip = new JSZip();
  await addFolder(fileSystem, zip, dir, dir.slice(dir.lastIndexOf("/") + 1));
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
