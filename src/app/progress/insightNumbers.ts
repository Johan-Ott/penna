import { averagePerDay, deadlinePlan, projectGoals } from "../../project/progress.js";
import type { Stats } from "../../project/stats.js";
import { manuscriptWords } from "../../project/treeLabels.js";
import type { Project } from "../useProject.js";

/** The book's words, goals and the writer's pace, as the cards in Insikter use them. */
export function insightNumbers(project: Project, stats: Stats, today: string) {
  const words = manuscriptWords(project.tree, project.summaries);
  const goals = projectGoals(project.fields);
  const average = averagePerDay(stats, today);
  const plan = deadlinePlan(
    { words, goal: goals.totalGoal, deadline: goals.deadline },
    today,
    average,
  );
  return { today, words, goals, average, plan };
}

export type Numbers = ReturnType<typeof insightNumbers>;
