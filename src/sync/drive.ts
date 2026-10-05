/** A file or folder in Google Drive; `version` changes whenever the file's content does. */
export interface RemoteFile {
  id: string;
  name: string;
  isFolder: boolean;
  version: string;
}

/** The little of Google Drive that syncing needs. `null` as a parent is the top of My Drive. */
export interface Drive {
  list(folderId: string): Promise<RemoteFile[]>;
  findFolder(name: string, parentId: string | null): Promise<string | null>;
  createFolder(name: string, parentId: string | null): Promise<string>;
  upload(name: string, parentId: string, bytes: Uint8Array): Promise<RemoteFile>;
  update(fileId: string, bytes: Uint8Array): Promise<RemoteFile>;
  download(fileId: string): Promise<Uint8Array>;
}
