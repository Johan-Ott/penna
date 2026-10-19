/** A file or folder in Google Drive; `version` changes whenever the file's content does. */
export interface RemoteFile {
  id: string;
  name: string;
  isFolder: boolean;
  version: string;
}

/** `null` as a parent is the top of My Drive. */
export interface Drive {
  list(folderId: string): Promise<RemoteFile[]>;
  findFolder(name: string, parentId: string | null): Promise<string | null>;
  createFolder(name: string, parentId: string | null): Promise<string>;
  upload(name: string, parentId: string, bytes: Uint8Array): Promise<RemoteFile>;
  /** Refuses with DriveChanged unless the file is still at `version`: another device wrote. */
  update(fileId: string, bytes: Uint8Array, version: string): Promise<RemoteFile>;
  download(fileId: string): Promise<Uint8Array>;
  /** Moves a file to Drive's trash, where it can be restored for 30 days. */
  trash(fileId: string): Promise<void>;
}

export class DriveChanged extends Error {}

/** Skrivro/ at the top of My Drive, or Penna/ where an earlier version put the books. */
export const findAppFolder = async (drive: Drive) =>
  (await drive.findFolder("Skrivro", null)) ?? (await drive.findFolder("Penna", null));

/** The app's folder, made the first time it is needed. */
export const appFolder = async (drive: Drive) =>
  (await findAppFolder(drive)) ?? (await drive.createFolder("Skrivro", null));
