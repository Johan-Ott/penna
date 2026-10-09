import { useEffect, useRef } from "react";
import { projectGoals } from "../../project/progress.js";
import { dayKey } from "../../project/stats.js";
import { manuscriptWords } from "../../project/treeLabels.js";
import type { Project } from "../useProject.js";
import { celebrate } from "./journeyEvents.js";
import { numberLocale, t } from "../../i18n/i18n.js";

/** True when a change took the book from under its goal to it or past it. */
export const crossesGoal = (before: number, after: number, goal: number | null) =>
  goal !== null && before < goal && after >= goal;

/** The first draft reaching the book's goal is celebrated once, and the day kept in the book. */
export function useMilestone(
  project: Project | null,
  updateFields: (fields: Record<string, unknown>) => void,
) {
  const previous = useRef<{ dir: string; words: number } | null>(null);
  useEffect(() => {
    if (!project) return;
    const words = manuscriptWords(project.tree, project.summaries);
    const before = previous.current;
    previous.current = { dir: project.dir, words };
    if (before?.dir !== project.dir || project.fields["firstDraftDone"]) return;
    if (!crossesGoal(before.words, words, projectGoals(project.fields).totalGoal)) return;
    celebrate({
      kind: "milestone",
      title: t("Första utkastet är klart."),
      text: t("{count} ord i {book}.", {
        count: words.toLocaleString(numberLocale()),
        book: project.name,
      }),
    });
    updateFields({ firstDraftDone: dayKey(Date.now()) });
  }, [project, updateFields]);
}
