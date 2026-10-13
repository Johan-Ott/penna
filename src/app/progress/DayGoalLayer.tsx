import { dailyGoalOf, dayKey } from "../../project/stats.js";
import type { AppState } from "../App.js";
import { DayDialog } from "../journey/DayDialog.js";
import { createStore } from "../store.js";
import type { Project } from "../useProject.js";
import { GoalsDialog } from "./GoalsDialog.js";

// The day's words in the top bar open the day's goal, and from there the goals themselves;
// Insikter, with the week and the book, opens from the blocks' dock.

const shown = createStore<"day" | "goals" | null>(null);

export const showDayGoal = () => shown.set("day");

export function DayGoalLayer({ app, project }: { app: AppState; project: Project }) {
  const open = shown.use();
  const close = () => shown.set(null);
  if (open === "day")
    return (
      <DayDialog
        words={app.stats[dayKey(Date.now())] ?? 0}
        goal={dailyGoalOf(project.fields)}
        journey={app.journey.journey}
        onGoals={() => shown.set("goals")}
        onClose={close}
      />
    );
  if (open === "goals")
    return (
      <GoalsDialog
        fields={project.fields}
        onSave={(fields) => void app.updateFields(fields)}
        onClose={close}
      />
    );
  return null;
}
