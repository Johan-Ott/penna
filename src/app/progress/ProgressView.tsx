import { useState } from "react";
import {
  averagePerDay,
  deadlinePlan,
  longestStreak,
  projectGoals,
  shortDay,
} from "../../project/progress.js";
import { dayKey, streak, type Stats } from "../../project/stats.js";
import { chapterWords, manuscriptWords } from "../../project/treeLabels.js";
import type { Project } from "../useProject.js";
import { GoalsDialog } from "./GoalsDialog.js";
import { Heatmap } from "./Heatmap.js";

const format = (words: number) => words.toLocaleString("sv-SE");
const days = (count: number) => (count === 1 ? "1 dag" : `${count} dagar`);

interface ProgressNumbers {
  words: number;
  goals: ReturnType<typeof projectGoals>;
  average: number;
  plan: ReturnType<typeof deadlinePlan>;
}

function numbersOf(project: Project, stats: Stats, today: string): ProgressNumbers {
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

function Kpi(props: { label: string; value: string; sub: string }) {
  return (
    <div className="progress-card kpi">
      <span className="kpi-label">{props.label}</span>
      <span className="kpi-value">{props.value}</span>
      <span className="kpi-sub">{props.sub}</span>
    </div>
  );
}

function kpisOf(numbers: ProgressNumbers, stats: Stats, today: string) {
  const { words, goals, average, plan } = numbers;
  return [
    [
      "Ord totalt",
      format(words),
      goals.totalGoal ? `Mål: ${format(goals.totalGoal)}` : "Inget slutmål",
    ],
    ["Dagar i rad", days(streak(stats, today)), `Rekord: ${days(longestStreak(stats))}`],
    ["Snitt per dag", format(average), "Senaste 30 dagarna"],
    [
      "Deadline",
      goals.deadline ? shortDay(goals.deadline) : "Ingen",
      plan
        ? `${days(plan.daysLeft)} kvar · ${plan.isOnTrack ? "i fas" : "efter"}`
        : "Sätt en under Ändra mål",
    ],
  ];
}

function Kpis(props: { numbers: ProgressNumbers; stats: Stats; today: string }) {
  return (
    <div className="kpis">
      {kpisOf(props.numbers, props.stats, props.today).map(([label = "", value = "", sub = ""]) => (
        <Kpi key={label} label={label} value={value} sub={sub} />
      ))}
    </div>
  );
}

function planLine(plan: NonNullable<ProgressNumbers["plan"]>, average: number) {
  if (plan.wordsPerDay === 0) return "Slutmålet är nått.";
  const needed = format(plan.wordsPerDay);
  return `Du behöver ${needed} ord per dag för att nå deadline. Du skriver i snitt ${format(average)}.`;
}

function Bar({ share, label }: { share: number; label: string }) {
  return (
    <div
      className="progress-bar large"
      role="progressbar"
      aria-label={label}
      aria-valuenow={share}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div style={{ width: `${share}%` }} />
    </div>
  );
}

// "Mot slutmanus": how far the manuscript has come, and what it takes to make the deadline.
function TowardsGoal({ numbers }: { numbers: ProgressNumbers }) {
  const { words, goals, average, plan } = numbers;
  if (!goals.totalGoal) return null;
  const share = Math.min(100, Math.round((100 * words) / goals.totalGoal));
  return (
    <div className="progress-card">
      <div className="progress-row">
        <span className="progress-title">Mot slutmanus</span>
        <span className="kpi-sub">
          {format(words)} av {format(goals.totalGoal)} ord · {share} %
        </span>
      </div>
      <Bar share={share} label="Mot slutmanus" />
      {plan && <span className="kpi-sub">{planLine(plan, average)}</span>}
    </div>
  );
}

function Chapters({ project }: { project: Project }) {
  const chapters = chapterWords(project.tree, project.summaries);
  const most = Math.max(1, ...chapters.map((chapter) => chapter.words));
  return (
    <div className="progress-card">
      <span className="progress-title">Ord per kapitel</span>
      {chapters.length === 0 && <span className="kpi-sub">Inga kapitel än.</span>}
      {chapters.map((chapter) => (
        <div key={chapter.id} className="chapter-bar">
          <span className="chapter-name">{chapter.label}</span>
          <div className="progress-bar">
            <div style={{ width: `${(100 * chapter.words) / most}%` }} />
          </div>
          <span className="kpi-sub">{format(chapter.words)}</span>
        </div>
      ))}
    </div>
  );
}

function ProgressHeader({ onChangeGoals }: { onChangeGoals: () => void }) {
  return (
    <header className="toolbar">
      <span className="toolbar-title">Framsteg</span>
      <button className="button secondary small" onClick={onChangeGoals}>
        Ändra mål
      </button>
    </header>
  );
}

/** Framsteg, as in the design: the numbers, the way to the goal, the last weeks, the chapters. */
export function ProgressView(props: {
  project: Project;
  stats: Stats;
  onSaveGoals: (fields: Record<string, unknown>) => void;
}) {
  const { project, stats } = props;
  const [isGoalsOpen, setGoalsOpen] = useState(false);
  const today = dayKey(Date.now());
  const numbers = numbersOf(project, stats, today);
  return (
    <main className="progress-view">
      <ProgressHeader onChangeGoals={() => setGoalsOpen(true)} />
      <div className="progress-content">
        <Kpis numbers={numbers} stats={stats} today={today} />
        <TowardsGoal numbers={numbers} />
        <div className="progress-columns">
          <Heatmap stats={stats} today={today} dailyGoal={numbers.goals.dailyGoal} />
          <Chapters project={project} />
        </div>
      </div>
      {isGoalsOpen && (
        <GoalsDialog
          fields={project.fields}
          onSave={props.onSaveGoals}
          onClose={() => setGoalsOpen(false)}
        />
      )}
    </main>
  );
}
