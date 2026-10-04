import type { Mentions } from "../../project/cards.js";
import { chapterOf } from "../../project/treeLabels.js";
import type { Project } from "../useProject.js";

/** "EB" for Elin Berg, "A" for Arvid: the round mark on a card. */
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toLocaleUpperCase("sv-SE"))
    .join("");

/** The chapters a card is mentioned in, by number, in manuscript order. */
export const mentionedChapters = (project: Project, mentions: Mentions | undefined) =>
  (mentions?.sceneIds ?? []).flatMap((id) => {
    const chapter = chapterOf(project.tree, id);
    return chapter ? [chapter.number] : [];
  });

export const mentionCount = (count: number) =>
  count === 1 ? "1 omnämnande" : `${count.toLocaleString("sv-SE")} omnämnanden`;
