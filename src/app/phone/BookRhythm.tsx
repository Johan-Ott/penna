import { contentsRows } from "../../project/contents.js";
import { projectGoals } from "../../project/progress.js";
import { statusSteps } from "../../project/statusSteps.js";
import { manuscriptWords } from "../../project/treeLabels.js";
import type { Project } from "../useProject.js";
import { numberLocale, t } from "../../i18n/i18n.js";

/** The book's rhythm: each chapter as long as its words, in its step's colour, and what is left. */
export function BookRhythm({ project }: { project: Project }) {
  const rows = contentsRows(project.tree, project.summaries).filter((row) => row.words > 0);
  const words = manuscriptWords(project.tree, project.summaries);
  const goal = projectGoals(project.fields).totalGoal;
  const left = goal ? Math.max(0, goal - words) : 0;
  if (rows.length === 0) return null;
  const steps = statusSteps(project.fields);
  const label = t("Bokens rytm: {chapters} kapitel, {count} ord kvar", {
    chapters: rows.length,
    count: left.toLocaleString(numberLocale()),
  });
  return (
    <span className="book-rhythm" role="img" aria-label={label}>
      {rows.map((row) => (
        <span
          key={row.id}
          style={{
            flexGrow: row.words,
            background: steps[row.status].color || "var(--border-control)",
          }}
        />
      ))}
      {left > 0 && <span className="left" style={{ flexGrow: left }} />}
    </span>
  );
}
