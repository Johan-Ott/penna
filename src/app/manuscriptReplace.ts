import type { SearchQuery } from "prosemirror-search";
import { replaceAllInText } from "../editor/manuscriptSearch.js";
import { takeSnapshot } from "../project/snapshots.js";
import { writeAtomic } from "../storage/atomicWrite.js";
import { t } from "../i18n/i18n.js";
import { type FileSystem, scenePath } from "../storage/fileSystem.js";

export interface SceneChange {
  id: string;
  before: string;
  after: string;
}

export async function replaceInScenes(
  fileSystem: FileSystem,
  dir: string,
  sceneIds: string[],
  query: SearchQuery,
) {
  const changes: SceneChange[] = [];
  let count = 0;
  for (const id of sceneIds) {
    const before = await fileSystem.readText(scenePath(dir, id)).catch(() => null);
    if (before === null) continue;
    const result = replaceAllInText(before, query);
    if (result.count === 0) continue;
    // A version first, so the scene can be found as it was even after Penna has closed.
    const label = t("Före Ersätt alla");
    await takeSnapshot(fileSystem, { dir, id }, before, { time: Date.now(), label });
    await writeAtomic(fileSystem, scenePath(dir, id), result.text);
    changes.push({ id, before, after: result.text });
    count += result.count;
  }
  return { changes, count };
}

/** A scene written in since the replace keeps its new text, so undoing never loses words. */
export async function undoReplace(fileSystem: FileSystem, dir: string, changes: SceneChange[]) {
  const skipped: string[] = [];
  for (const change of changes) {
    const now = await fileSystem.readText(scenePath(dir, change.id)).catch(() => null);
    if (now === change.after)
      await writeAtomic(fileSystem, scenePath(dir, change.id), change.before);
    else skipped.push(change.id);
  }
  return skipped;
}
