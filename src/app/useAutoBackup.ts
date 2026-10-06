import { useEffect, useRef } from "react";
import {
  backupFileName,
  backupFolderOf,
  backupsIn,
  backupsToRemove,
  takeBackup,
} from "../project/backups.js";
import { recordFailure } from "./errorLog.js";
import { platform } from "./platform.js";

const EVERY = 30 * 60 * 1000;
/** A book reopened within this time is not copied again. */
const FRESH = 10 * 60 * 1000;

/** Why the last automatic copy failed, for the dialog to say; null when it worked. */
export const autoBackup = { failure: null as string | null };

const automatically = (copy: Promise<void>) =>
  copy
    .then(() => void (autoBackup.failure = null))
    .catch((error: unknown) => {
      autoBackup.failure = error instanceof Error ? error.message : String(error);
      recordFailure("Säkerhetskopia")(error);
    });

/** Copies the book, and its series, then removes the copies past what is kept. */
export async function backupNow(dirs: string[], label: string | null = null) {
  const backups = platform.backups;
  const [bookDir] = dirs;
  if (!backups || !bookDir) return;
  const backupsDir = await backups.dir();
  await takeBackup(platform.fileSystem, backupsDir, dirs, backupFileName(Date.now(), label));
  const files = await backupsIn(platform.fileSystem, backupFolderOf(backupsDir, bookDir));
  for (const old of backupsToRemove(files, Date.now())) await backups.remove(old.path);
}

// On opening, the book is copied as it was before anything in this session touched it.
async function openingBackup(dirs: string[]) {
  const backups = platform.backups;
  const [bookDir] = dirs;
  if (!backups || !bookDir) return;
  const folder = backupFolderOf(await backups.dir(), bookDir);
  const [newest] = await backupsIn(platform.fileSystem, folder);
  if (!newest || Date.now() - newest.time > FRESH) await backupNow(dirs);
}

/** A copy when the book opens, and every half hour while something in it changes. */
export function useAutoBackup(dirs: string[], project: unknown) {
  const current = useRef(dirs);
  const hasChanged = useRef(false);
  current.current = dirs;
  useEffect(() => {
    hasChanged.current = true;
  }, [project]);
  const key = dirs.join("\n");
  useEffect(() => {
    if (!key) return;
    void automatically(openingBackup(current.current));
    hasChanged.current = false;
    const timer = setInterval(() => {
      if (!hasChanged.current) return;
      hasChanged.current = false;
      void automatically(backupNow(current.current));
    }, EVERY);
    return () => clearInterval(timer);
  }, [key]);
}
