import JSZip from "jszip";
import type { FileSystem } from "../storage/fileSystem.js";
import { filesIn } from "../storage/folderFiles.js";

/** A book and, when it has one, its series, each under its own name. */
export async function projectZip(fileSystem: FileSystem, dirs: string[]): Promise<Uint8Array> {
  const zip = new JSZip();
  for (const dir of dirs) {
    const name = dir.slice(dir.lastIndexOf("/") + 1);
    for (const [path, bytes] of await filesIn(fileSystem, dir)) zip.file(`${name}/${path}`, bytes);
  }
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
