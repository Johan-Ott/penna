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
  pickFile: (kind) =>
    new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = kind.extensions.map((extension) => `.${extension}`).join(",");
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return resolve(null);
        void file
          .arrayBuffer()
          .then((buffer) => resolve({ path: file.name, bytes: new Uint8Array(buffer) }));
      };
      input.click();
    }),
  // In the browser an export is downloaded; the bytes are copied so the Blob owns its buffer.
  saveFile: async (suggestedName, bytes) => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([bytes.slice()]));
    link.download = suggestedName;
    link.click();
    URL.revokeObjectURL(link.href);
    return suggestedName;
  },
};
