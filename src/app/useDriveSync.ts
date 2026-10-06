import { useCallback, useEffect, useRef, useState } from "react";
import { syncProject } from "../sync/driveSync.js";
import { DriveError, googleDrive } from "../sync/googleDrive.js";
import type { AppPreferences } from "./appPreferences.js";
import { errorLog, recordFailure } from "./errorLog.js";
import { platform } from "./platform.js";
import type { PreferenceChange } from "./useStartup.js";
import { t } from "../i18n/i18n.js";

export type DriveStatus =
  | { kind: "off" }
  | { kind: "signingIn" }
  | { kind: "syncing" }
  | { kind: "done"; doneAt: number }
  | { kind: "failed"; message: string };

// A book syncs when it opens and then every five minutes.
const EVERY = 5 * 60_000;

const failure = (error: unknown): DriveStatus => ({
  kind: "failed",
  message:
    error instanceof DriveError && error.status === 401
      ? t("Logga in på Google igen")
      : String(error instanceof Error ? error.message : error),
});

async function syncFolders(dirs: string[]) {
  const signIn = platform.googleSignIn;
  if (!signIn) return false;
  const drive = googleDrive(signIn.accessToken, signIn.fetch);
  let hasChanged = false;
  for (const dir of dirs) {
    const result = await syncProject(platform.fileSystem, drive, dir, Date.now());
    hasChanged ||= result.downloaded.length + result.trashed.length > 0;
  }
  return hasChanged;
}

// One object, so turning the sync off when it already is changes nothing and renders nothing.
const OFF: DriveStatus = { kind: "off" };

function useSyncRun(dirs: string[], refresh: () => Promise<void>) {
  const [status, setStatus] = useState<DriveStatus>(OFF);
  const isRunning = useRef(false);
  // "|" cannot appear in a path, so the folders make one stable key for the callback.
  const dirsKey = dirs.join("|");
  const syncNow = useCallback(async () => {
    if (!dirsKey || isRunning.current) return;
    isRunning.current = true;
    setStatus({ kind: "syncing" });
    try {
      const hasChanged = await syncFolders(dirsKey.split("|"));
      setStatus({ kind: "done", doneAt: Date.now() });
      if (hasChanged) await refresh();
    } catch (error) {
      errorLog.record(`Synk: ${String(error)}`);
      setStatus(failure(error));
    } finally {
      isRunning.current = false;
    }
  }, [dirsKey, refresh]);
  return { status, setStatus, syncNow };
}

function useDriveConnection(
  updatePreferences: (change: PreferenceChange) => void,
  setStatus: (status: DriveStatus) => void,
) {
  const connect = async () => {
    setStatus({ kind: "signingIn" });
    try {
      await platform.googleSignIn?.connect();
      updatePreferences((current) => ({ ...current, isDriveSyncOn: true }));
    } catch (error) {
      setStatus(failure(error));
    }
  };
  const disconnect = async () => {
    updatePreferences((current) => ({ ...current, isDriveSyncOn: false }));
    await platform.googleSignIn?.disconnect().catch(recordFailure("Utloggning från Google"));
  };
  return { connect, disconnect };
}

export function useDriveSync(
  dirs: string[],
  preferences: AppPreferences,
  updatePreferences: (change: PreferenceChange) => void,
  refresh: () => Promise<void>,
) {
  const isAvailable = platform.googleSignIn !== undefined;
  const isOn = preferences.isDriveSyncOn && isAvailable;
  const { status, setStatus, syncNow } = useSyncRun(dirs, refresh);
  useEffect(() => {
    if (!isOn) return setStatus(OFF);
    void syncNow();
    const timer = setInterval(() => void syncNow(), EVERY);
    return () => clearInterval(timer);
  }, [isOn, syncNow, setStatus]);
  return {
    isAvailable,
    isOn,
    status,
    syncNow,
    ...useDriveConnection(updatePreferences, setStatus),
  };
}

export type DriveSync = ReturnType<typeof useDriveSync>;
