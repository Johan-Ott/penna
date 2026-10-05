import type { Drive, RemoteFile } from "../src/sync/drive";

interface Stored {
  file: RemoteFile;
  parentId: string | null;
  bytes: Uint8Array;
}

/** A Google Drive in memory: folders and files by id, a new version on every write. */
export function createFakeDrive() {
  const items = new Map<string, Stored>();
  let next = 0;
  const store = (name: string, parentId: string | null, isFolder: boolean, bytes: Uint8Array) => {
    const id = `id${++next}`;
    const file: RemoteFile = { id, name, isFolder, version: `v${next}` };
    items.set(id, { file, parentId, bytes });
    return file;
  };
  const drive: Drive = {
    list: async (folderId) =>
      [...items.values()].filter((item) => item.parentId === folderId).map((item) => item.file),
    findFolder: async (name, parentId) =>
      [...items.values()].find(
        (item) => item.file.isFolder && item.file.name === name && item.parentId === parentId,
      )?.file.id ?? null,
    createFolder: async (name, parentId) => store(name, parentId, true, new Uint8Array()).id,
    upload: async (name, parentId, bytes) => store(name, parentId, false, bytes),
    update: async (fileId, bytes) => {
      const item = items.get(fileId);
      if (!item) throw new Error(`No file ${fileId}`);
      item.bytes = bytes;
      item.file = { ...item.file, version: `v${++next}` };
      return item.file;
    },
    download: async (fileId) => items.get(fileId)?.bytes ?? new Uint8Array(),
  };
  // What another device does: change a file in Drive by its path under a folder.
  const textAt = (path: string) => {
    const item = [...items.values()].find((candidate) => pathOf(candidate) === path);
    return item ? new TextDecoder().decode(item.bytes) : null;
  };
  const pathOf = (item: Stored): string => {
    const parent = item.parentId ? items.get(item.parentId) : undefined;
    return parent ? `${pathOf(parent)}/${item.file.name}` : item.file.name;
  };
  const writeAt = async (path: string, text: string) => {
    const item = [...items.values()].find((candidate) => pathOf(candidate) === path);
    if (item) await drive.update(item.file.id, new TextEncoder().encode(text));
  };
  return { drive, textAt, writeAt };
}
