import type { Drive, RemoteFile } from "./drive.js";

// Drive tells files apart by id, not by name, so two devices uploading at once can leave two
// files, or two folders, of the same name side by side. None of them is ever left out here.

export interface RemoteTree {
  /** The one file at each path the sync works with. */
  files: Map<string, RemoteFile>;
  /** The others at the same path, settled after the sync: merged, set beside, or trashed. */
  duplicates: [string, RemoteFile][];
  /** The first folder at each path, where new files go; the files in all of them are read. */
  folders: Map<string, string>;
}

async function listAll(drive: Drive, folderId: string, prefix: string, found: Listing) {
  for (const file of await drive.list(folderId)) {
    const path = prefix ? `${prefix}/${file.name}` : file.name;
    if (file.isFolder) {
      if (!found.folders.has(path)) found.folders.set(path, file.id);
      await listAll(drive, file.id, path, found);
    } else {
      found.files.set(path, [...(found.files.get(path) ?? []), file]);
    }
  }
}

interface Listing {
  files: Map<string, RemoteFile[]>;
  folders: Map<string, string>;
}

/** Everything under the book's folder; where a path holds more than one file, the one synced
 * before is the one worked with, and the rest are duplicates. */
export async function remoteTree(
  drive: Drive,
  rootId: string,
  knownId: (path: string) => string | undefined,
): Promise<RemoteTree> {
  const found: Listing = { files: new Map(), folders: new Map() };
  await listAll(drive, rootId, "", found);
  const tree: RemoteTree = { files: new Map(), duplicates: [], folders: found.folders };
  for (const [path, all] of found.files) {
    const chosen = all.find((file) => file.id === knownId(path)) ?? all[0];
    if (!chosen) continue;
    tree.files.set(path, chosen);
    for (const other of all) if (other !== chosen) tree.duplicates.push([path, other]);
  }
  return tree;
}
