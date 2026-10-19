import { createMemoryFileSystem } from "../storage/memoryFileSystem.js";
import type { FileSystem } from "../storage/fileSystem.js";
import type { BasePlatform } from "./types.js";

// The browser as a pretend computer: a home folder in memory with the files the app starts with,
// nothing to update, and files saved and picked the way a web page can.

const parentOf = (path: string) => path.slice(0, path.lastIndexOf("/"));

function pickFile(extensions: string[]) {
  return new Promise<{ path: string; bytes: Uint8Array } | null>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = extensions.map((extension) => `.${extension}`).join(",");
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      void file
        .arrayBuffer()
        .then((buffer) => resolve({ path: file.name, bytes: new Uint8Array(buffer) }));
    };
    input.click();
  });
}

// The bytes are copied so the Blob owns its buffer.
async function saveFile(suggestedName: string, bytes: Uint8Array) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([bytes.slice()]));
  link.download = suggestedName;
  link.click();
  URL.revokeObjectURL(link.href);
  return suggestedName;
}

async function notify(title: string, body: string) {
  if (!("Notification" in window)) return;
  const permission = await Notification.requestPermission();
  if (permission === "granted") new Notification(title, { body });
}

type Watcher = { dir: string; onChange: (changed?: string[]) => void };

// Writes tell the folders watching them, as the computer's own folder watch does in the app.
function watchedFileSystem(fileSystem: FileSystem, watchers: Set<Watcher>): FileSystem {
  const told = (paths: string[]) =>
    watchers.forEach(({ dir, onChange }) => {
      const inside = paths.filter((path) => path.startsWith(`${dir}/`));
      if (inside.length > 0) onChange(inside);
    });
  return {
    ...fileSystem,
    writeText: async (path, text) => (await fileSystem.writeText(path, text), told([path])),
    writeBytes: async (path, bytes) => (await fileSystem.writeBytes(path, bytes), told([path])),
    rename: async (from, to) => (await fileSystem.rename(from, to), told([from, to])),
  };
}

/** `files` by their full path under `home`, such as an example to try the app with. */
export function createBrowserPlatform(home: string, files: Record<string, string>): BasePlatform {
  const watchers = new Set<Watcher>();
  const fileSystem = watchedFileSystem(createMemoryFileSystem(files), watchers);
  return {
    isPhone: false,
    webFetch: (input, init) => fetch(input, init),
    fileSystem,
    pickFolder: async () => `${home}/Dokument`,
    openLink: async (url) => void window.open(url, "_blank", "noreferrer"),
    knownFolders: async () => ({ home, documents: `${home}/Dokument` }),
    folderExists: async (path) =>
      (await fileSystem.list(parentOf(path))).includes(path.slice(path.lastIndexOf("/") + 1)),
    watchFolder: async (dir, onChange) => {
      const watcher = { dir, onChange };
      watchers.add(watcher);
      return () => void watchers.delete(watcher);
    },
    guardClose: () => () => undefined,
    // The browser always runs the version it was served.
    checkForUpdate: async () => null,
    readClipboard: () => navigator.clipboard.readText(),
    notify,
    pickFile: (kind) => pickFile(kind.extensions),
    saveFile,
  };
}
