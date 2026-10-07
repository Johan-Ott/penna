import { sceneTitle, splitSceneFile } from "../manuscript/sceneFile.js";
import type { RecoverableTemp } from "../storage/atomicWrite.js";
import { joinPath, type FileSystem } from "../storage/fileSystem.js";
import { setAside } from "../storage/setAside.js";
import type { SceneFileRef } from "../storage/syncFiles.js";
import {
  createScene,
  openScene,
  type ConflictChoice,
  type DiskConflict,
  type SceneSession,
} from "./sceneSession.js";
import { t } from "../i18n/i18n.js";

// Dropbox: "ID (Elins iPhone's conflicted copy 2026-10-03).md", in Swedish "...:s motstridiga
// kopia". OneDrive: "ID-ELINS-LAPTOP.md". iCloud's "ID 2.md" names no device.
const DROPBOX_DEVICE = /\((.+?)(?:'s conflicted copy|:s motstridiga kopia)/;
const ONEDRIVE_DEVICE = /^[0-9A-HJKMNP-TV-Z]+-(.+)\.md$/;

export function copyDevice(fileName: string): string | null {
  return DROPBOX_DEVICE.exec(fileName)?.[1] ?? ONEDRIVE_DEVICE.exec(fileName)?.[1] ?? null;
}

const scenesDir = (dir: string) => joinPath(dir, "scenes");

export async function readSyncCopy(
  fileSystem: FileSystem,
  dir: string,
  copy: SceneFileRef,
): Promise<DiskConflict> {
  return {
    editorText: await fileSystem.readText(joinPath(scenesDir(dir), `${copy.sceneId}.md`)),
    diskText: await fileSystem.readText(joinPath(scenesDir(dir), copy.fileName)),
  };
}

const isOpen = (session: SceneSession, dir: string, id: string) =>
  session.scene?.dir === dir && session.scene.id === id;

async function copyAsNewScene(fileSystem: FileSystem, dir: string, copy: SceneFileRef) {
  const text = await fileSystem.readText(joinPath(scenesDir(dir), copy.fileName));
  const { frontMatter, body } = splitSceneFile(text);
  const device = copyDevice(copy.fileName);
  const title = sceneTitle(frontMatter) ?? t("Scen");
  const named = device
    ? t("{title} (från {device})", { title, device })
    : t("{title} (andra versionen)", { title });
  return createScene(fileSystem, dir, named, body);
}

/** "both" returns the id of the new scene made from the copy. */
export async function keepVersion(
  session: SceneSession,
  dir: string,
  copy: SceneFileRef,
  choice: ConflictChoice,
): Promise<string | null> {
  const fileSystem = session.fileSystem;
  const scenePath = joinPath(scenesDir(dir), `${copy.sceneId}.md`);
  const copyPath = joinPath(scenesDir(dir), copy.fileName);
  if (!(await session.autosave.flush())) return null;
  const newId = choice === "both" ? await copyAsNewScene(fileSystem, dir, copy) : null;
  if (choice === "theirs") {
    await setAside(
      fileSystem,
      dir,
      scenePath,
      t("{id} (den här enhetens).md", { id: copy.sceneId }),
    );
    await fileSystem.rename(copyPath, scenePath);
    if (isOpen(session, dir, copy.sceneId)) await openScene(session, dir, copy.sceneId);
  } else {
    await setAside(fileSystem, dir, copyPath, copy.fileName);
  }
  return newId;
}

export const crashSceneId = (temp: RecoverableTemp) =>
  temp.targetPath.slice(temp.targetPath.lastIndexOf("/") + 1, -".md".length);

// Settled before any scene opens: the next save would overwrite the temp file.
export const restoreCrashText = (fileSystem: FileSystem, temp: RecoverableTemp) =>
  fileSystem.rename(temp.tempPath, temp.targetPath);

export const setAsideCrashText = (fileSystem: FileSystem, dir: string, temp: RecoverableTemp) =>
  setAside(fileSystem, dir, temp.tempPath, `${crashSceneId(temp)} (osparad vid krasch).md`);
