import { readText } from "@tauri-apps/plugin-clipboard-manager";
import { fetch as appFetch } from "@tauri-apps/plugin-http";
import { openPath, openUrl, revealItemInDir } from "@tauri-apps/plugin-opener";
import {
  cancel,
  isPermissionGranted,
  requestPermission,
  Schedule,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ask, open, save } from "@tauri-apps/plugin-dialog";
import { exists, readFile, rename, watch, writeFile, type WatchEvent } from "@tauri-apps/plugin-fs";
import { appDataDir, documentDir, homeDir } from "@tauri-apps/api/path";
import { tauriFileSystem } from "../storage/tauriFileSystem.js";
import type { BasePlatform, FileKind, PickKind } from "./types.js";
import { checkForAndroidUpdate, shareAsSave, shareFile } from "./android.js";
import { isTestBuild, testAsk, testPath } from "./testMode.js";
import { t } from "../i18n.js";

// The device through Tauri, on a computer and on a phone. On a phone the files live in the app's
// own folder and updates come as a newer APK from the app's GitHub releases.

export const isPhone = /Android|iPhone|iPad/i.test(navigator.userAgent);
export const isAndroid = /Android/i.test(navigator.userAgent);

export const withForwardSlashes = (path: string) => path.replaceAll("\\", "/").replace(/\/$/, "");

/** The system's question, unless a test has answered it already. */
export const confirm = async (...question: Parameters<typeof ask>) =>
  (await testAsk()) ?? ask(...question);

// The debounced watch hands a list of events, each with its paths; none means read it all.
function changedPaths(event: WatchEvent | WatchEvent[]) {
  const paths = [event].flat().flatMap((one) => one.paths.map(withForwardSlashes));
  return paths.length > 0 ? paths : undefined;
}

const askToCloseAnyway = () =>
  confirm(
    t("Texten kunde inte sparas. Stänger du nu försvinner det du skrivit sedan senaste sparning."),
    {
      title: t("Osparad text"),
      kind: "warning",
      okLabel: t("Stäng ändå"),
      cancelLabel: t("Fortsätt skriva"),
    },
  );

// Written beside the target and renamed, so a crash never leaves half a file. The dialog only
// grants the chosen path, so outside the home folder the file is written directly, still whole.
async function saveFile(suggestedName: string, bytes: Uint8Array, kind: FileKind) {
  const answer = await testPath();
  const path =
    answer !== undefined
      ? answer
      : await save({
          defaultPath: suggestedName,
          filters: [{ name: kind.name, extensions: [kind.extension] }],
        });
  if (!path) return null;
  const temp = `${path}.tmp`;
  try {
    await writeFile(temp, bytes);
    await rename(temp, path);
  } catch {
    await writeFile(path, bytes);
  }
  return withForwardSlashes(path);
}

const canNotify = async () =>
  (await isPermissionGranted()) || (await requestPermission()) === "granted";

async function notify(title: string, body: string) {
  if (await canNotify()) sendNotification({ title, body });
}

const REMINDER_ID = 1;

async function scheduleReminder(when: Date | null, title: string, body: string) {
  await cancel([REMINDER_ID]);
  if (when && (await canNotify()))
    sendNotification({ id: REMINDER_ID, title, body, schedule: Schedule.at(when, false, true) });
}

async function checkForUpdate() {
  const update = await check();
  if (!update) return null;
  return {
    version: update.version,
    ...(update.body ? { notes: update.body } : {}),
    install: async (onProgress?: (share: number) => void) => {
      let size = 0;
      let done = 0;
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") size = event.data.contentLength ?? 0;
        if (event.event === "Progress") done += event.data.chunkLength;
        if (size > 0) onProgress?.(Math.min(done / size, 1));
      });
      await relaunch();
    },
  };
}

// The computer updates itself; an Android phone fetches the APK; an iPhone has its App Store.
function updateCheck(repository: string) {
  if (!isPhone) return checkForUpdate;
  if (isAndroid) return () => checkForAndroidUpdate(repository);
  return async () => null;
}

// Only documents and pictures open in their program. Anything else, which could be a program,
// is shown in its folder instead.
const OPENS = /\.(pdf|txt|md|docx|odt|epub|png|jpe?g|gif|webp|bmp|heic)$/i;
const openFile = (path: string) => (OPENS.test(path) ? openPath(path) : revealItemInDir(path));

// The dialog grants the app the picked file, wherever it lies.
async function pickFile(kind: PickKind) {
  const answer = await testPath();
  const filters = kind.extensions.length > 0 ? [kind] : [];
  const picked = answer !== undefined ? answer : await open({ filters });
  if (typeof picked !== "string") return null;
  return { path: withForwardSlashes(picked), bytes: await readFile(picked) };
}

// A test build's files live in its own app data, away from the real Documents folder.
const computerFolders = async () => {
  if (await isTestBuild) {
    const own = withForwardSlashes(await appDataDir());
    return { home: own, documents: `${own}/Dokument` };
  }
  return {
    home: withForwardSlashes(await homeDir()),
    documents: withForwardSlashes(await documentDir()),
  };
};

const phoneFolders = async () => {
  const own = withForwardSlashes(await appDataDir());
  return { home: own, documents: own };
};

const windowControls = {
  minimize: () => void getCurrentWindow().minimize(),
  toggleMaximize: () => void getCurrentWindow().toggleMaximize(),
  close: () => void getCurrentWindow().close(),
};

async function pickFolder() {
  if (isPhone) return null;
  const answer = await testPath();
  const picked = answer !== undefined ? answer : await open({ directory: true });
  return typeof picked === "string" ? withForwardSlashes(picked) : null;
}

function guardClose(isSafeToClose: () => Promise<boolean>) {
  const appWindow = getCurrentWindow();
  const stopListening = appWindow.onCloseRequested(async (event) => {
    if (await isSafeToClose()) return;
    event.preventDefault();
    if (await askToCloseAnyway()) await appWindow.destroy();
  });
  return () => void stopListening.then((stop) => stop());
}

/** The device through Tauri; `releases` is the GitHub repository a phone's updates come from. */
export const createTauriPlatform = ({ releases }: { releases: string }): BasePlatform => ({
  isPhone,
  webFetch: appFetch as typeof fetch,
  saveFile: isAndroid ? shareAsSave : saveFile,
  ...(isAndroid ? { shareFile } : {}),
  pickFile,
  ...(isPhone ? {} : { openFile, readClipboard: readText, windowControls }),
  fileSystem: tauriFileSystem,
  checkForUpdate: updateCheck(releases),
  notify,
  ...(isPhone ? { scheduleReminder } : {}),
  ...(isPhone ? {} : { showInFolder: (path: string) => revealItemInDir(path) }),
  knownFolders: isPhone ? phoneFolders : computerFolders,
  folderExists: (path) => exists(path),
  openLink: (url) => openUrl(url),
  pickFolder,
  // Some phones cannot watch folders; the app then reads them again on its own saves.
  watchFolder: (dir, onChange) =>
    watch(dir, (event) => onChange(changedPaths(event)), { recursive: true, delayMs: 300 }).catch(
      () => () => undefined,
    ),
  guardClose,
});
