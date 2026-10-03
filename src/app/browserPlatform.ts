import { DEMO_PROJECT_FILES } from "../demo/demoProject.js";
import { parentOf } from "../project/libraryFolders.js";
import { createMemoryFileSystem } from "../storage/memoryFileSystem.js";
import type { Platform } from "./platform.js";

// A pretend computer for the browser: a home folder with OneDrive, and the example project.
const HOME = "/Användare/Elin";
const fileSystem = createMemoryFileSystem({
  ...DEMO_PROJECT_FILES,
  [`${HOME}/OneDrive/desktop.ini`]: "",
  [`${HOME}/Dokument/desktop.ini`]: "",
});

export const browserPlatform: Platform = {
  fileSystem,
  pickFolder: async () => `${HOME}/Dokument`,
  knownFolders: async () => ({ home: HOME, documents: `${HOME}/Dokument` }),
  folderExists: async (path) =>
    (await fileSystem.list(parentOf(path))).includes(path.slice(path.lastIndexOf("/") + 1)),
  watchFolder: async () => () => undefined,
  guardClose: () => () => undefined,
};
