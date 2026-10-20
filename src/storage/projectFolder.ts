import { findRecoverableTemps, type RecoverableTemp } from "@llkit/storage/atomicWrite.js";
import { joinPath, type FileSystem } from "@llkit/storage/fileSystem.js";
import { classifySceneFiles, type SceneFolderListing } from "./syncFiles.js";

export interface OpenedProject extends SceneFolderListing {
  recoverable: RecoverableTemp[];
}

/** Writes nothing. */
export async function openProjectFolder(fileSystem: FileSystem, dir: string) {
  const scenesDir = joinPath(dir, "scenes");
  const names = await fileSystem.list(scenesDir);
  const listing = classifySceneFiles(names);
  const recoverable = await findRecoverableTemps(fileSystem, scenesDir, names);
  const project: OpenedProject = { ...listing, recoverable };
  return project;
}
