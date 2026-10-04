import { findNode, manuscriptSceneIds, type TreeNode } from "./tree.js";
import { chapterOf } from "./treeLabels.js";

/** A scene in the reading view, with its chapter's title when the chapter starts there. */
export interface ReadingScene {
  sceneId: string;
  chapterTitle: string | null;
}

/** The scenes to read in a row: one chapter's, or the whole manuscript's when `chapterId` is null. */
export function readingScenes(tree: TreeNode[], chapterId: string | null): ReadingScene[] {
  const chapter = chapterId ? findNode(tree, chapterId)?.node : null;
  const ids = manuscriptSceneIds(chapter ? [chapter] : tree);
  return ids.map((sceneId) => {
    const found = chapterOf(tree, sceneId);
    const title = found?.isFirstScene ? `${found.number}. ${found.title}` : null;
    return { sceneId, chapterTitle: title };
  });
}
