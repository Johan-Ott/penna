import { useCallback, useEffect, useState } from "react";
import { joinPath } from "@llkit/storage/fileSystem.js";
import { findAppFolder } from "../../sync/drive.js";
import { googleDrive } from "../../sync/googleDrive.js";
import { syncProject } from "../../sync/driveSync.js";
import { readState, STATE_FILE } from "../../sync/syncState.js";
import { recordFailure } from "@llkit/errorLog.js";
import { platform } from "../platform.js";

// The books in the writer's Drive this device lacks, fetched when tapped. One that stopped
// halfway has a folder but no sync state, so it shows again to be finished.

const driveOf = () => {
  const signIn = platform.googleSignIn;
  return signIn ? googleDrive(signIn.accessToken, signIn.fetch) : null;
};

/** A book in Drive by its folder's name and id. */
export type CloudBook = { name: string; id: string };

async function booksOnDrive(libraryDir: string): Promise<CloudBook[]> {
  const drive = driveOf();
  const folder = drive && (await findAppFolder(drive));
  if (!drive || !folder) return [];
  const folders = (await drive.list(folder)).filter((file) => file.isFolder);
  const synced = await Promise.all(
    folders.map((folder) =>
      platform.fileSystem.modifiedAt(joinPath(libraryDir, `${folder.name}/${STATE_FILE}`)),
    ),
  );
  return folders
    .filter((_folder, index) => synced[index] === null)
    .map((folder) => ({ name: folder.name, id: folder.id }));
}

/** Where a book on this device keeps its copy in Drive, or null when it has none. */
export const driveFolderOf = async (dir: string) =>
  (await readState(platform.fileSystem, dir)).folderId;

/** A folder in Drive to Drive's trash, where it can be restored for 30 days. */
export const trashOnDrive = async (folderId: string) => driveOf()?.trash(folderId);

/** How far a book's fetch has come, in files; `all` is 0 until Drive has been listed. */
export type Fetching = { name: string; done: number; all: number };

export function useCloudBooks(libraryDir: string | null, isSignedIn: boolean) {
  const [books, setBooks] = useState<CloudBook[]>([]);
  const [fetching, setFetching] = useState<Fetching | null>(null);
  const look = useCallback(() => {
    if (!libraryDir || !isSignedIn) return setBooks([]);
    void booksOnDrive(libraryDir)
      .then(setBooks)
      .catch(recordFailure("Böckerna i Drive kunde inte listas"));
  }, [libraryDir, isSignedIn]);
  useEffect(look, [look]);
  const fetch = async (name: string) => {
    const drive = driveOf();
    if (!drive || !libraryDir) return null;
    const dir = joinPath(libraryDir, name);
    setFetching({ name, done: 0, all: 0 });
    const onProgress = (done: number, all: number) => setFetching({ name, done, all });
    try {
      await syncProject(platform.fileSystem, drive, dir, { now: Date.now(), onProgress });
      return dir;
    } finally {
      setFetching(null);
      look();
    }
  };
  const remove = (book: CloudBook) =>
    void trashOnDrive(book.id).then(look).catch(recordFailure("Borttagningen i Drive"));
  return { books, fetching, fetch, remove, look };
}
