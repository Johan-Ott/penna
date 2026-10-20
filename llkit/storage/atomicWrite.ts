import { joinPath, type FileSystem } from "./fileSystem.js";

export const TEMP_SUFFIX = ".skrivro-tmp";
/** The file a temp file stands for; the app wrote .penna-tmp while it was called Penna. */
export const targetOfTemp = (path: string) => path.replace(/\.(skrivro|penna)-tmp$/, "");
export const isTempFile = (path: string) => targetOfTemp(path) !== path;

export interface RecoverableTemp {
  tempPath: string;
  targetPath: string;
}

export function tempPathFor(path: string): string {
  return path + TEMP_SUFFIX;
}

// A crash between the two steps leaves the old file whole and the new text in the temp file.
export async function writeAtomic(
  fileSystem: FileSystem,
  path: string,
  content: string | Uint8Array,
) {
  const tempPath = tempPathFor(path);
  if (typeof content === "string") await fileSystem.writeText(tempPath, content);
  else await fileSystem.writeBytes(tempPath, content);
  await fileSystem.rename(tempPath, path);
}

/** Temp files left by a crash that hold newer text than their target. An empty one is a write
 * that never began, and is left out. */
export async function findRecoverableTemps(fileSystem: FileSystem, dir: string) {
  const tempNames = (await fileSystem.list(dir)).filter(isTempFile);
  const found: RecoverableTemp[] = [];
  for (const name of tempNames) {
    const tempPath = joinPath(dir, name);
    const targetPath = targetOfTemp(tempPath);
    const isEmpty = (await fileSystem.readBytes(tempPath).catch(() => null))?.length === 0;
    if (!isEmpty && (await isNewerThanTarget(fileSystem, tempPath, targetPath))) {
      found.push({ tempPath, targetPath });
    }
  }
  return found;
}

async function isNewerThanTarget(fileSystem: FileSystem, tempPath: string, targetPath: string) {
  const targetTime = await fileSystem.modifiedAt(targetPath);
  if (targetTime === null) return true;
  const tempTime = (await fileSystem.modifiedAt(tempPath)) ?? 0;
  return tempTime > targetTime;
}
