import { useState } from "react";
import {
  averagePerDay,
  daysBetween,
  deadlinePlan,
  projectGoals,
  shortDay,
} from "../../project/progress.js";
import { dayKey, streak, type Stats } from "../../project/stats.js";
import { chapterWords, manuscriptWords } from "../../project/treeLabels.js";
import type { Project } from "../useProject.js";
import { useEscape } from "../useShortcut.js";
import { GoalsDialog } from "./GoalsDialog.js";
import { Heatmap } from "./Heatmap.js";
import { NoStats } from "./NoStats.js";
import { t, numberLocale } from "../../i18n/i18n.js";

const format = (words: number) => words.toLocaleString(numberLocale());
const days = (count: number) => (count === 1 ? t("1 dag") : t("{count} dagar", { count }));

function numbersOf(project: Project, stats: Stats, today: string) {
  const words = manuscriptWords(project.tree, project.summaries);
  const goals = projectGoals(project.fields);
  const average = averagePerDay(stats, today);
  const plan = deadlinePlan(
    { words, goal: goals.totalGoal, deadline: goals.deadline },
    today,
    average,
  );
  return { words, goals, average, plan };
}

type Numbers = ReturnType<typeof numbersOf>;

// "12 dagar i rad", "940 ord per dag i snitt", "103 dagar till deadline".
function Figures({ numbers, stats, today }: { numbers: Numbers; stats: Stats; today: string }) {
  const { deadline } = numbers.goals;
  const figures: [string, string][] = [
    [days(streak(stats, today)), t("i rad")],
    [format(numbers.average), t("ord per dag i snitt")],
    deadline
      ? [days(Math.max(0, daysBetween(today, deadline))), t("till deadline")]
      : [t("Ingen"), t("deadline")],
  ];
  return (
    <div className="progress-figures">
      {figures.map(([value, label]) => (
        <div key={label} className="progress-figure">
          <span className="progress-value">{value}</span>
          <span className="progress-label">{label}</span>
        </div>
      ))}
    </div>
  );
}

function planLine(numbers: Numbers) {
  const { plan, goals, average } = numbers;
  if (!plan || !goals.deadline) return null;
  if (plan.wordsPerDay === 0) return t("Slutmålet är nått.");
  return t("{needed} ord per dag räcker till {day}. Du skriver i snitt {average}.", {
    needed: format(plan.wordsPerDay),
    day: shortDay(goals.deadline),
    average: format(average),
  });
}

// "Mot slutmanus": how far the manuscript has come, and what it takes to make the deadline.
function TowardsGoal({ numbers }: { numbers: Numbers }) {
  const { words, goals } = numbers;
  if (!goals.totalGoal) return null;
  const share = Math.min(100, Math.round((100 * words) / goals.totalGoal));
  const line = planLine(numbers);
  return (
    <section className="progress-section">
      <div className="progress-row">
        <span className="progress-title">{t("Mot slutmanus")}</span>
        <span className="progress-label">
          {t("{words} av {goal} ord", { words: format(words), goal: format(goals.totalGoal) })}
        </span>
      </div>
      <div
        className="progress-bar"
        role="progressbar"
        aria-label={t("Mot slutmanus")}
        aria-valuenow={share}
      >
        <div style={{ width: `${share}%` }} />
      </div>
      {line && <span className="progress-label">{line}</span>}
    </section>
  );
}

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

function ProgressBody(props: { project: Project; stats: Stats; onWrite: () => void }) {
  const { project, stats } = props;
  const today = dayKey(Date.now());
  const numbers = numbersOf(project, stats, today);
  return (
    <>
      {Object.keys(stats).length === 0 && <NoStats onWrite={props.onWrite} />}
      <Figures numbers={numbers} stats={stats} today={today} />
      <TowardsGoal numbers={numbers} />
      <Heatmap stats={stats} today={today} dailyGoal={numbers.goals.dailyGoal} />
      <Chapters project={project} />
    </>
  );
}

/** Framsteg, opened from the day's words in the top bar: the numbers, the goal, the weeks. */
export function ProgressPopover(props: {
  project: Project;
  stats: Stats;
  onSaveGoals: (fields: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const { project, stats } = props;
  const [isGoalsOpen, setGoalsOpen] = useState(false);
  useEscape(() => !isGoalsOpen && props.onClose());
  return (
    <>
      <div className="popover-backdrop" onClick={props.onClose} />
      <div className="progress-popover" role="dialog" aria-label={t("Framsteg")}>
        <ProgressBody project={project} stats={stats} onWrite={props.onClose} />
        <button className="link-button quiet" onClick={() => setGoalsOpen(true)}>
          {t("Ändra mål och deadline")}
        </button>
      </div>
      {isGoalsOpen && (
        <GoalsDialog
          fields={project.fields}
          onSave={props.onSaveGoals}
          onClose={() => setGoalsOpen(false)}
        />
      )}
    </>
  );
}
