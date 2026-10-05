import { useCallback, useEffect, useRef, useState } from "react";
import { syncProject } from "../sync/driveSync.js";
import { DriveError, googleDrive } from "../sync/googleDrive.js";
import type { AppPreferences } from "./appPreferences.js";
import { platform } from "./platform.js";
import type { PreferenceChange } from "./useStartup.js";
import { t } from "../i18n/i18n.js";

/** How the sync with Google Drive is doing, for the row in Inställningar. */
export type DriveStatus =
  | { kind: "off" }
  | { kind: "signingIn" }
  | { kind: "syncing" }
  | { kind: "done"; doneAt: number }
  | { kind: "failed"; message: string };

// While a book is open it syncs when it opens and then every five minutes.
const EVERY = 5 * 60_000;

const failure = (error: unknown): DriveStatus => ({
  kind: "failed",
  message:
    error instanceof DriveError && error.status === 401
      ? t("Logga in på Google igen")
      : String(error instanceof Error ? error.message : error),
});

function useSyncRun(dir: string | null, refresh: () => Promise<void>) {
  const [status, setStatus] = useState<DriveStatus>({ kind: "off" });
  const isRunning = useRef(false);
  const syncNow = useCallback(async () => {
    const signIn = platform.googleSignIn;
    if (!signIn || !dir || isRunning.current) return;
    isRunning.current = true;
    setStatus({ kind: "syncing" });
    try {
      const drive = googleDrive(signIn.accessToken, signIn.fetch);
      const result = await syncProject(platform.fileSystem, drive, dir, Date.now());
      setStatus({ kind: "done", doneAt: Date.now() });
      if (result.downloaded.length > 0) await refresh();
    } catch (error) {
      setStatus(failure(error));
    } finally {
      isRunning.current = false;
    }
  }, [dir, refresh]);
  return { status, setStatus, syncNow };
}

// Connecting asks the writer to sign in; disconnecting forgets the sign-in on this device.
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
    await platform.googleSignIn?.disconnect().catch(() => undefined);
  };
  return { connect, disconnect };
}

/** Syncs the open book with Google Drive when the writer has connected Drive on this device. */
export function useDriveSync(
  dir: string | null,
  preferences: AppPreferences,
  updatePreferences: (change: PreferenceChange) => void,
  refresh: () => Promise<void>,
) {
  const isAvailable = platform.googleSignIn !== undefined;
  const isOn = preferences.isDriveSyncOn && isAvailable;
  const { status, setStatus, syncNow } = useSyncRun(dir, refresh);
  useEffect(() => {
    if (!isOn) return setStatus({ kind: "off" });
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
