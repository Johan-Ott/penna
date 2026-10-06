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
import { exists, readFile, rename, watch, writeFile } from "@tauri-apps/plugin-fs";
import { appDataDir, documentDir, homeDir } from "@tauri-apps/api/path";
import { tauriFileSystem } from "../storage/tauriFileSystem.js";
import type { FileKind, PickKind, Platform } from "./platform.js";
import { androidSignIn, computerSignIn } from "./tauriGoogleSignIn.js";
import { t } from "../i18n/i18n.js";

// On a phone the books live in the app's own folder and updates come from the app store.
const isPhone = /Android|iPhone|iPad/i.test(navigator.userAgent);

function googleSignInHere() {
  if (/Android/i.test(navigator.userAgent)) return { googleSignIn: androidSignIn };
  return isPhone ? {} : { googleSignIn: computerSignIn };
}

const withForwardSlashes = (path: string) => path.replaceAll("\\", "/").replace(/\/$/, "");

// A computer puts the book in its trash; a phone has none, so the question says so.
async function removeBook(dir: string, title: string) {
  const message = isPhone
    ? t("”{title}” raderas från telefonen. En kopia i Google Drive finns kvar.", { title })
    : t("”{title}” flyttas till papperskorgen, där du kan lägga tillbaka den.", { title });
  const isSure = await ask(message, {
    title: t("Ta bort boken"),
    kind: "warning",
    okLabel: t("Ta bort"),
    cancelLabel: t("Avbryt"),
  });
  if (isSure) await invoke("remove_book", { path: dir });
  return isSure;
}

const askToCloseAnyway = () =>
  ask(
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
  const path = await save({
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
  const picked = await open({ filters: [kind] });
  if (typeof picked !== "string") return null;
  return { path: withForwardSlashes(picked), bytes: await readFile(picked) };
}

const computerFolders = async () => ({
  home: withForwardSlashes(await homeDir()),
  documents: withForwardSlashes(await documentDir()),
});

const phoneFolders = async () => {
  const own = withForwardSlashes(await appDataDir());
  return { home: own, documents: own };
};

const backups = {
  dir: async () => `${withForwardSlashes(await appDataDir())}/backups`,
  remove: (path: string) => invoke("remove_backup", { path }).then(() => undefined),
};

export const tauriPlatform: Platform = {
  isPhone,
  webFetch: appFetch as typeof fetch,
  removeBook,
  backups,
  saveFile,
  pickFile,
  fileSystem: tauriFileSystem,
  setSpellLanguage: (language) => invoke("set_spell_language", { language }),
  checkForUpdate: isPhone ? async () => null : checkForUpdate,
  notify,
  ...(isPhone ? {} : { showInFolder: (path: string) => revealItemInDir(path) }),
  knownFolders: isPhone ? phoneFolders : computerFolders,
  ...googleSignInHere(),
  folderExists: (path) => exists(path),

  async pickFolder() {
    if (isPhone) return null;
    const picked = await open({ directory: true });
    return typeof picked === "string" ? withForwardSlashes(picked) : null;
  },

  // Some phones cannot watch folders; Penna then reads them again on its own saves.
  watchFolder: (dir, onChange) =>
    watch(dir, onChange, { recursive: true, delayMs: 300 }).catch(() => () => undefined),

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
