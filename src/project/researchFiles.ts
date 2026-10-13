import { newSceneText, withField } from "../manuscript/sceneFile.js";
import { writeAtomic } from "../storage/atomicWrite.js";
import { joinPath, scenePath, type FileSystem } from "../storage/fileSystem.js";
import { newSceneId } from "../storage/sceneId.js";

// A research file, such as a PDF or a photo, is a note that points to its copy in the book's
// filer/ folder: it syncs and is backed up with the book, and the note holds the writer's words.

const FILES_DIR = "filer";

export const researchPath = (dir: string, name: string) => joinPath(joinPath(dir, FILES_DIR), name);

export const isPictureFile = (name: string) => /\.(jpe?g|png|gif|webp)$/i.test(name);

const splitName = (name: string) => {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ""];
};

/** Under a free name, so a file already there is never replaced. Returns the name. */
export async function saveResearchFile(
  fileSystem: FileSystem,
  dir: string,
  path: string,
  bytes: Uint8Array,
) {
  const folder = joinPath(dir, FILES_DIR);
  await fileSystem.makeDir(folder);
  const taken = await fileSystem.list(folder);
  const original = path.slice(path.lastIndexOf("/") + 1) || "fil";
  const [stem, extension] = splitName(original);
  let name = original;
  for (let number = 2; taken.includes(name); number++) name = `${stem} ${number}${extension}`;
  await writeAtomic(fileSystem, researchPath(dir, name), bytes);
  return name;
}

/** A note named after the file, pointing to it. Returns the note's id. */
export async function createFileNote(fileSystem: FileSystem, dir: string, name: string) {
  const id = newSceneId();
  const text = withField(
    newSceneText(id, splitName(name)[0] ?? name),
    "file",
    JSON.stringify(name),
  );
  await fileSystem.makeDir(joinPath(dir, "scenes"));
  await writeAtomic(fileSystem, scenePath(dir, id), text);
  return id;
}
