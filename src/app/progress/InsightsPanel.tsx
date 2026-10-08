import { useState } from "react";
import { dayKey, type Stats } from "../../project/stats.js";
import { chapterWords } from "../../project/treeLabels.js";
import type { Project } from "../useProject.js";
import { useEscape } from "../useShortcut.js";
import { WordsByLabel, WordsByStatus } from "./BookSplit.js";
import { GoalsDialog } from "./GoalsDialog.js";
import { Heatmap } from "./Heatmap.js";
import { DayCard, TowardsGoal, WeekCard } from "./InsightCards.js";
import { insightNumbers } from "./insightNumbers.js";
import { NoStats } from "./NoStats.js";
import { t, numberLocale } from "../../i18n/i18n.js";

const format = (words: number) => words.toLocaleString(numberLocale());

function Chapters({ project }: { project: Project }) {
  const chapters = chapterWords(project.tree, project.summaries);
  const most = Math.max(1, ...chapters.map((chapter) => chapter.words));
  if (chapters.length === 0) return null;
  return (
    <section className="progress-section">
      <span className="progress-label">{t("Ord per kapitel")}</span>
      {chapters.map((chapter) => (
        <div key={chapter.id} className="chapter-bar">
          <span className="chapter-name">{chapter.label}</span>
          <div className="progress-bar thin">
            <div style={{ width: `${(100 * chapter.words) / most}%` }} />
          </div>
          <span className="progress-label">{format(chapter.words)}</span>
        </div>
      ))}
    </section>
  );
}

function InsightsBody(props: {
  project: Project;
  stats: Stats;
  onWrite: () => void;
  onGoals: () => void;
}) {
  const { project, stats } = props;
  const numbers = insightNumbers(project, stats, dayKey(Date.now()));
  return (
    <>
      {Object.keys(stats).length === 0 && <NoStats onWrite={props.onWrite} />}
      <DayCard
        words={stats[numbers.today] ?? 0}
        goal={numbers.goals.dailyGoal}
        onGoals={props.onGoals}
      />
      <TowardsGoal numbers={numbers} />
      <WeekCard stats={stats} numbers={numbers} />
      <Heatmap stats={stats} today={numbers.today} dailyGoal={numbers.goals.dailyGoal} />
      <Chapters project={project} />
      <WordsByStatus project={project} />
      <WordsByLabel project={project} />
    </>
  );
}

const InsightsHead = ({ onClose }: { onClose: () => void }) => (
  <div className="insights-head">
    <span className="insights-title">{t("Insikter")}</span>
    <button className="icon-button" aria-label={t("Stäng insikter")} onClick={onClose}>
      ×
    </button>
  </div>
);

/** Insikter: beside the text, how the day, the week and the book are going. */
export function InsightsPanel(props: {
  project: Project;
  stats: Stats;
  onSaveGoals: (fields: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const [isGoalsOpen, setGoalsOpen] = useState(false);
  useEscape(() => !isGoalsOpen && props.onClose());
  return (
    <aside className="insights-panel" aria-label={t("Insikter")}>
      <InsightsHead onClose={props.onClose} />
      <InsightsBody
        project={props.project}
        stats={props.stats}
        onWrite={props.onClose}
        onGoals={() => setGoalsOpen(true)}
      />
      <button className="link-button quiet" onClick={() => setGoalsOpen(true)}>
        {t("Ändra mål och deadline")}
      </button>
      {isGoalsOpen && (
        <GoalsDialog
          fields={props.project.fields}
          onSave={props.onSaveGoals}
          onClose={() => setGoalsOpen(false)}
        />
      )}
    </aside>
  );
}
