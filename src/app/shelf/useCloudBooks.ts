import { useCallback, useEffect, useState } from "react";
import { joinPath } from "../../storage/fileSystem.js";
import { googleDrive } from "../../sync/googleDrive.js";
import { syncProject } from "../../sync/driveSync.js";
import { STATE_FILE } from "../../sync/syncState.js";
import { recordFailure } from "../errorLog.js";
import { platform } from "../platform.js";

// The books in the writer's Drive this device lacks, fetched when tapped. One that stopped
// halfway has a folder but no sync state, so it shows again to be finished.

const driveOf = () => {
  const signIn = platform.googleSignIn;
  return signIn ? googleDrive(signIn.accessToken, signIn.fetch) : null;
};

async function booksOnDrive(libraryDir: string) {
  const drive = driveOf();
  const penna = drive && (await drive.findFolder("Penna", null));
  if (!drive || !penna) return [];
  const folders = (await drive.list(penna)).filter((file) => file.isFolder);
  const synced = await Promise.all(
    folders.map((folder) =>
      platform.fileSystem.modifiedAt(joinPath(libraryDir, `${folder.name}/${STATE_FILE}`)),
    ),
  );
  return folders.filter((_folder, index) => synced[index] === null).map((folder) => folder.name);
}

/** How far a book's fetch has come, in files; `all` is 0 until Drive has been listed. */
export type Fetching = { name: string; done: number; all: number };

export function useCloudBooks(libraryDir: string | null, isSignedIn: boolean) {
  const [names, setNames] = useState<string[]>([]);
  const [fetching, setFetching] = useState<Fetching | null>(null);
  const look = useCallback(() => {
    if (!libraryDir || !isSignedIn) return setNames([]);
    void booksOnDrive(libraryDir)
      .then(setNames)
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
  return { names, fetching, fetch };
}
