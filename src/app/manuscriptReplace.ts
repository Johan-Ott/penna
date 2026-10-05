import type { SearchQuery } from "prosemirror-search";
import { replaceAllInText } from "../editor/manuscriptSearch.js";
import { writeAtomic } from "../storage/atomicWrite.js";
import { joinPath, type FileSystem } from "../storage/fileSystem.js";

export interface SceneChange {
  id: string;
  before: string;
  after: string;
}

const scenePath = (dir: string, id: string) => joinPath(dir, `scenes/${id}.md`);

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
