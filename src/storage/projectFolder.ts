import { findRecoverableTemps, type RecoverableTemp } from "./atomicWrite.js";
import { joinPath, type FileSystem } from "./fileSystem.js";
import { classifySceneFiles, type SceneFolderListing } from "./syncFiles.js";

export interface OpenedProject extends SceneFolderListing {
  recoverable: RecoverableTemp[];
}

/** Writes nothing. */
export async function openProjectFolder(fileSystem: FileSystem, dir: string) {
  const scenesDir = joinPath(dir, "scenes");
  const listing = classifySceneFiles(await fileSystem.list(scenesDir));
  const recoverable = await findRecoverableTemps(fileSystem, scenesDir);
  const project: OpenedProject = { ...listing, recoverable };
  return project;
}
