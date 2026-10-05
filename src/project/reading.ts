import { findNode, manuscriptSceneIds, type TreeNode } from "./tree.js";
import { chapterOf } from "./treeLabels.js";

export interface ReadingScene {
  sceneId: string;
  chapterTitle: string | null;
}

/** One chapter, or the whole manuscript when `chapterId` is null. */
export function readingScenes(tree: TreeNode[], chapterId: string | null): ReadingScene[] {
  const chapter = chapterId ? findNode(tree, chapterId)?.node : null;
  const ids = manuscriptSceneIds(chapter ? [chapter] : tree);
  return ids.map((sceneId) => {
    const found = chapterOf(tree, sceneId);
    const title = found?.isFirstScene ? `${found.number}. ${found.title}` : null;
    return { sceneId, chapterTitle: title };
  });
}
