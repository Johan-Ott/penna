import { joinPath, type FileSystem } from "./fileSystem.js";

const TEMP_SUFFIX = ".penna-tmp";

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

/** Temp files left by a crash that hold newer text than their target. */
export async function findRecoverableTemps(fileSystem: FileSystem, dir: string) {
  const tempNames = (await fileSystem.list(dir)).filter((name) => name.endsWith(TEMP_SUFFIX));
  const found: RecoverableTemp[] = [];
  for (const name of tempNames) {
    const tempPath = joinPath(dir, name);
    const targetPath = tempPath.slice(0, -TEMP_SUFFIX.length);
    if (await isNewerThanTarget(fileSystem, tempPath, targetPath)) {
      found.push({ tempPath, targetPath });
    }
  }
  return found;
}

export async function recoverTemp(fileSystem: FileSystem, temp: RecoverableTemp) {
  await fileSystem.rename(temp.tempPath, temp.targetPath);
}

async function isNewerThanTarget(fileSystem: FileSystem, tempPath: string, targetPath: string) {
  const targetTime = await fileSystem.modifiedAt(targetPath);
  if (targetTime === null) return true;
  const tempTime = (await fileSystem.modifiedAt(tempPath)) ?? 0;
  return tempTime > targetTime;
}
