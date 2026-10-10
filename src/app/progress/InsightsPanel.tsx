import { useState } from "react";
import { dailyGoalOf, dayKey, type Stats } from "../../project/stats.js";
import { chapterWords } from "../../project/treeLabels.js";
import type { AppState } from "../App.js";
import type { Project } from "../useProject.js";
import { useEscape } from "../useShortcut.js";
import { WordsByLabel, WordsByStatus } from "./BookSplit.js";
import { GoalsDialog } from "./GoalsDialog.js";
import { Heatmap } from "./Heatmap.js";
import { DayCard, TowardsGoal, WeekCard } from "./InsightCards.js";
import { insightNumbers } from "./insightNumbers.js";
import { NoStats } from "./NoStats.js";
import { Colophon } from "./Colophon.js";
import { journeySummary } from "../../project/inkwell.js";
import type { Journey } from "../../project/journey.js";
import { JourneyCard } from "../journey/JourneyCard.js";
import { JourneyDialog } from "../journey/JourneyDialog.js";
import { DayDialog } from "../journey/DayDialog.js";
import { SprintChoices } from "../sprint/SprintBar.js";
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
  journey: Journey;
  onGoals: () => void;
  onJourney: () => void;
}) {
  const { project, stats } = props;
  const numbers = insightNumbers(project, stats, dayKey(Date.now()));
  return (
    <>
      <DayCard
        words={stats[numbers.today] ?? 0}
        goal={numbers.goals.dailyGoal}
        onGoals={props.onGoals}
      />
      <TowardsGoal numbers={numbers} />
      <WeekCard stats={stats} numbers={numbers} />
      <JourneyCard
        summary={journeySummary(props.journey, numbers.today)}
        onOpen={props.onJourney}
      />
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

function ShownAs(props: { isColophon: boolean; onChange: (isColophon: boolean) => void }) {
  const option = (label: string, isColophon: boolean) => (
    <button
      role="radio"
      aria-checked={props.isColophon === isColophon}
      onClick={() => props.onChange(isColophon)}
    >
      {label}
    </button>
  );
  return (
    <div className="segmented small" role="radiogroup" aria-label={t("Visa som")}>
      {option(t("Kort"), false)}
      {option(t("Kolofon"), true)}
    </div>
  );
}

type PanelProps = {
  project: Project;
  stats: Stats;
  journey: Journey;
  onHoliday: (isOn: boolean) => void;
  onSaveGoals: (fields: Record<string, unknown>) => void;
  onClose: () => void;
};

type Open = "goals" | "journey" | "day" | null;

function InsightDialogs(props: PanelProps & { open: Open; onOpen: (open: Open) => void }) {
  if (props.open === "day")
    return (
      <DayDialog
        words={props.stats[dayKey(Date.now())] ?? 0}
        goal={dailyGoalOf(props.project.fields)}
        journey={props.journey}
        onGoals={() => props.onOpen("goals")}
        onClose={() => props.onOpen(null)}
      />
    );
  if (props.open === "goals")
    return (
      <GoalsDialog
        fields={props.project.fields}
        onSave={props.onSaveGoals}
        onClose={props.onClose}
      />
    );
  if (props.open === "journey")
    return (
      <JourneyDialog journey={props.journey} onHoliday={props.onHoliday} onClose={props.onClose} />
    );
  return null;
}

/** Insikter: beside the text, how the day, the week and the book are going. */
export function InsightsPanel(props: PanelProps) {
  const [open, setOpen] = useState<Open>(null);
  const [isColophon, setColophon] = useState(false);
  useEscape(() => !open && props.onClose());
  const hasStats = Object.keys(props.stats).length > 0;
  return (
    <aside className="insights-panel" aria-label={t("Insikter")}>
      <InsightsHead onClose={props.onClose} />
      <SprintChoices onStart={props.onClose} />
      {hasStats && <ShownAs isColophon={isColophon} onChange={setColophon} />}
      {!hasStats && <NoStats onWrite={props.onClose} />}
      {isColophon ? (
        <Colophon project={props.project} stats={props.stats} />
      ) : (
        <InsightsBody
          project={props.project}
          stats={props.stats}
          journey={props.journey}
          onGoals={() => setOpen("day")}
          onJourney={() => setOpen("journey")}
        />
      )}
      <button className="link-button quiet" onClick={() => setOpen("goals")}>
        {t("Ändra mål och deadline")}
      </button>
      <InsightDialogs {...props} open={open} onOpen={setOpen} onClose={() => setOpen(null)} />
    </aside>
  );
}

/** The panel when it is open, on the computer and on a phone alike. */
export function InsightsLayer({ app, project }: { app: AppState; project: Project }) {
  if (!app.writingMode.isProgressOpen) return null;
  return (
    <InsightsPanel
      project={project}
      stats={app.stats}
      journey={app.journey.journey}
      onHoliday={app.journey.setHoliday}
      onSaveGoals={(fields) => void app.updateFields(fields)}
      onClose={() => app.writingMode.setProgressOpen(false)}
    />
  );
}
