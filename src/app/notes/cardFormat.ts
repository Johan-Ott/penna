import type { Mentions } from "../../project/cards.js";
import { chapterOf } from "../../project/treeLabels.js";
import type { Project } from "../useProject.js";

export const mentionedChapters = (project: Project, mentions: Mentions | undefined) =>
  (mentions?.sceneIds ?? []).flatMap((id) => {
    const chapter = chapterOf(project.tree, id);
    return chapter ? [chapter.number] : [];
  });
