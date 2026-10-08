import { manuscriptSceneIds, type TreeNode } from "./tree.js";
import { chapterOf, type SceneChapter } from "./treeLabels.js";

export interface ReadingScene {
  sceneId: string;
  chapter: SceneChapter | null;
}

/** The whole manuscript in reading order, each scene with its chapter. */
export const readingScenes = (tree: TreeNode[]): ReadingScene[] =>
  manuscriptSceneIds(tree).map((sceneId) => ({ sceneId, chapter: chapterOf(tree, sceneId) }));
