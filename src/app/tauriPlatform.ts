import { readText } from "@tauri-apps/plugin-clipboard-manager";
import { fetch as appFetch } from "@tauri-apps/plugin-http";
import { invoke } from "@tauri-apps/api/core";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ask, open, save } from "@tauri-apps/plugin-dialog";
import { exists, readFile, rename, watch, writeFile, type WatchEvent } from "@tauri-apps/plugin-fs";
import { appDataDir, documentDir, homeDir } from "@tauri-apps/api/path";
import { tauriFileSystem } from "../storage/tauriFileSystem.js";
import type { FileKind, PickKind, Platform, Spelling } from "./platform.js";
import { androidSignIn, computerSignIn } from "./tauriGoogleSignIn.js";
import { isTestBuild, testAsk, testPath } from "./testMode.js";
import { t } from "../i18n/i18n.js";

// On a phone the books live in the app's own folder and updates come from the app store.
const isPhone = /Android|iPhone|iPad/i.test(navigator.userAgent);

function googleSignInHere() {
  if (/Android/i.test(navigator.userAgent)) return { googleSignIn: androidSignIn };
  return isPhone ? {} : { googleSignIn: computerSignIn };
}

// The system's question, unless a test has answered it already.
const confirm = async (...question: Parameters<typeof ask>) =>
  (await testAsk()) ?? ask(...question);

// The debounced watch hands a list of events, each with its paths; none means read it all.
function changedPaths(event: WatchEvent | WatchEvent[]) {
  const paths = [event].flat().flatMap((one) => one.paths.map(withForwardSlashes));
  return paths.length > 0 ? paths : undefined;
}

const withForwardSlashes = (path: string) => path.replaceAll("\\", "/").replace(/\/$/, "");

// A computer puts the book in its trash; a phone has none, so the question says so.
async function removeBook(dir: string, title: string) {
  const message = isPhone
    ? t("”{title}” raderas från telefonen. En kopia i Google Drive finns kvar.", { title })
    : t("”{title}” flyttas till papperskorgen, där du kan lägga tillbaka den.", { title });
  const isSure = await confirm(message, {
    title: t("Ta bort boken"),
    kind: "warning",
    okLabel: t("Ta bort"),
    cancelLabel: t("Avbryt"),
  });
  if (isSure) await invoke("remove_book", { path: dir });
  return isSure;
}

const askToCloseAnyway = () =>
  confirm(
    t("Scenen kunde inte sparas. Stänger du nu försvinner det du skrivit sedan senaste sparning."),
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
  const temp = `${path}.penna-tmp`;
  try {
    await writeFile(temp, bytes);
    await rename(temp, path);
  } catch {
    await writeFile(path, bytes);
  }
  return withForwardSlashes(path);
}

async function notify(title: string, body: string) {
  const isGranted = (await isPermissionGranted()) || (await requestPermission()) === "granted";
  if (isGranted) sendNotification({ title, body });
}

async function checkForUpdate() {
  const update = await check();
  if (!update) return null;
  return {
    version: update.version,
    install: async () => {
      await update.downloadAndInstall();
      await relaunch();
    },
  };
}

// The dialog grants Penna the picked file, wherever it lies.
async function pickFile(kind: PickKind) {
  const answer = await testPath();
  const picked = answer !== undefined ? answer : await open({ filters: [kind] });
  if (typeof picked !== "string") return null;
  return { path: withForwardSlashes(picked), bytes: await readFile(picked) };
}

// The test build's books live in its own app data, away from the real Documents folder.
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

const backups = {
  dir: async () => `${withForwardSlashes(await appDataDir())}/backups`,
  remove: (path: string) => invoke("remove_backup", { path }).then(() => undefined),
};

const spelling: Spelling = {
  misspelled: (language, words) => invoke("misspelled_words", { language, words }),
  suggestions: (language, word) => invoke("spelling_suggestions", { language, word }),
  addDictionary: (language, aff, dic) => invoke("add_dictionary", { language, aff, dic }),
};

export const tauriPlatform: Platform = {
  isPhone,
  webFetch: appFetch as typeof fetch,
  removeBook,
  backups,
  saveFile,
  pickFile,
  fileSystem: tauriFileSystem,
  spelling,
  ...(isPhone ? {} : { readClipboard: readText }),
  checkForUpdate: isPhone ? async () => null : checkForUpdate,
  notify,
  ...(isPhone ? {} : { showInFolder: (path: string) => revealItemInDir(path) }),
  knownFolders: isPhone ? phoneFolders : computerFolders,
  ...googleSignInHere(),
  folderExists: (path) => exists(path),

  async pickFolder() {
    if (isPhone) return null;
    const answer = await testPath();
    const picked = answer !== undefined ? answer : await open({ directory: true });
    return typeof picked === "string" ? withForwardSlashes(picked) : null;
  },

  // Some phones cannot watch folders; Penna then reads them again on its own saves.
  watchFolder: (dir, onChange) =>
    watch(dir, (event) => onChange(changedPaths(event)), { recursive: true, delayMs: 300 }).catch(
      () => () => undefined,
    ),

  guardClose(isSafeToClose) {
    const appWindow = getCurrentWindow();
    const stopListening = appWindow.onCloseRequested(async (event) => {
      if (await isSafeToClose()) return;
      event.preventDefault();
      if (await askToCloseAnyway()) await appWindow.destroy();
    });
    return () => void stopListening.then((stop) => stop());
  },
};
