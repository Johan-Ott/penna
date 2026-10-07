import { parseMarkdown } from "../manuscript/parseMarkdown.js";
import { splitSceneFile } from "../manuscript/sceneFile.js";
import { countDocumentWords } from "../manuscript/wordCount.js";
import { writeAtomic } from "../storage/atomicWrite.js";
import { joinPath, readIfThere, type FileSystem } from "../storage/fileSystem.js";
import { newSceneId } from "../storage/sceneId.js";
import { takeSnapshot } from "./snapshots.js";
import { t } from "../i18n/i18n.js";

/** A chapter or the whole book under a name: a copy of its scenes in utkast/<id>/scenes/, to read
 * beside the text and put back. In the book's folder, so it follows the book to Drive. */
export interface Draft {
  id: string;
  name: string;
  time: number;
  /** Null for the whole book. */
  chapterId: string | null;
  sceneIds: string[];
  words: number;
}

/** The folder a draft's scenes are read from, as a book's scenes/ is. */
export const draftDir = (bookDir: string, id: string) => joinPath(bookDir, `utkast/${id}`);

const wordsIn = (sceneText: string) =>
  countDocumentWords(parseMarkdown(splitSceneFile(sceneText).body));

export async function saveDraft(
  fileSystem: FileSystem,
  bookDir: string,
  what: { name: string; chapterId: string | null; sceneIds: string[] },
  now: number,
): Promise<Draft> {
  const id = newSceneId(now);
  const folder = joinPath(draftDir(bookDir, id), "scenes");
  await fileSystem.makeDir(folder);
  let words = 0;
  for (const sceneId of what.sceneIds) {
    const text = await readIfThere(fileSystem, joinPath(bookDir, `scenes/${sceneId}.md`));
    if (text === null) continue;
    words += wordsIn(text);
    await writeAtomic(fileSystem, joinPath(folder, `${sceneId}.md`), text);
  }
  const draft: Draft = { id, ...what, time: now, words };
  await writeAtomic(
    fileSystem,
    joinPath(draftDir(bookDir, id), "draft.json"),
    JSON.stringify(draft, null, 2),
  );
  return draft;
}

async function readDraft(fileSystem: FileSystem, bookDir: string, id: string) {
  const text = await readIfThere(fileSystem, joinPath(draftDir(bookDir, id), "draft.json")).catch(
    () => null,
  );
  try {
    const draft = text === null ? null : (JSON.parse(text) as Draft);
    return draft && typeof draft.name === "string" && Array.isArray(draft.sceneIds) ? draft : null;
  } catch {
    return null;
  }
}

/** Newest first. */
export async function listDrafts(fileSystem: FileSystem, bookDir: string): Promise<Draft[]> {
  const ids = await fileSystem.list(joinPath(bookDir, "utkast"));
  const drafts = await Promise.all(ids.map((id) => readDraft(fileSystem, bookDir, id)));
  return drafts
    .filter((draft): draft is Draft => draft !== null)
    .sort((one, other) => other.time - one.time);
}

/** Each scene's text now is kept as a version first, so putting the draft back can be undone. */
export async function restoreDraft(
  fileSystem: FileSystem,
  bookDir: string,
  draft: Draft,
  now: number,
) {
  const label = t("Före utkastet {name}", { name: draft.name });
  for (const sceneId of draft.sceneIds) {
    const saved = await readIfThere(
      fileSystem,
      joinPath(draftDir(bookDir, draft.id), `scenes/${sceneId}.md`),
    );
    if (saved === null) continue;
    const path = joinPath(bookDir, `scenes/${sceneId}.md`);
    const current = await readIfThere(fileSystem, path);
    if (current !== null && current !== saved) {
      await takeSnapshot(fileSystem, { dir: bookDir, id: sceneId }, current, { time: now, label });
    }
    await writeAtomic(fileSystem, path, saved);
  }
}

/** Into the book's trash folder, as nothing in Penna is deleted outright. */
export async function removeDraft(fileSystem: FileSystem, bookDir: string, draft: Draft) {
  await fileSystem.makeDir(joinPath(bookDir, "trash"));
  await fileSystem.rename(
    draftDir(bookDir, draft.id),
    joinPath(bookDir, `trash/utkast-${draft.id}`),
  );
}
