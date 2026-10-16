import { MANUSCRIPT_FILES, importManuscript } from "../../import/importManuscript.js";
import {
  copyExampleProject,
  createProject,
  type ProjectDetails,
} from "../../project/newProject.js";
import { suggestedStructure } from "../../project/templates.js";
import { platform } from "../platform.js";

// How a book comes to the shelf: made new from a title and its kind, read in from a manuscript,
// or the example. Each lands in the writer's library and is opened by the caller.

/** Penna's own folder in Documents, unless the writer has chosen another. */
export async function libraryOf(libraryDir: string | null) {
  const dir = libraryDir ?? `${(await platform.knownFolders()).documents}/Penna`;
  await platform.fileSystem.makeDir(dir);
  return dir;
}

/** What a new book starts from, before the writer has answered anything. */
export const startDetails = (dailyGoal: number): ProjectDetails => ({
  title: "",
  type: "roman",
  structure: suggestedStructure("roman", []),
  pieces: [],
  dailyGoal,
  deadline: "",
  narration: null,
});

export async function newBook(libraryDir: string, details: ProjectDetails) {
  return (await createProject(platform.fileSystem, libraryDir, details)).dir;
}

/** Null when the writer closes the file dialog without choosing. */
export async function importedBook(libraryDir: string, goal: number) {
  const picked = await platform.pickFile(MANUSCRIPT_FILES);
  if (!picked) return null;
  const { title, book } = await importManuscript(platform.fileSystem, picked);
  const made = await createProject(
    platform.fileSystem,
    libraryDir,
    { ...startDetails(goal), title },
    book,
  );
  return made.dir;
}

export const exampleBook = (libraryDir: string) =>
  copyExampleProject(platform.fileSystem, libraryDir);
