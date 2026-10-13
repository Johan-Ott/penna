import type { PointerEvent } from "react";
import { useFloating } from "../blocks/BlockPanel.js";
import { usePhone } from "../phone/usePhone.js";
import { GripIcon } from "../shell/icons.js";
import { CloseButton } from "../controls.js";
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
import { t, formatNumber } from "../../i18n/i18n.js";

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
          <span className="progress-label">{formatNumber(chapter.words)}</span>
        </div>
      ))}
    </section>
  );
}

interface BodyProps {
  project: Project;
  stats: Stats;
  journey: Journey;
  onGoals: () => void;
  onJourney: () => void;
}

function InsightsBody(props: BodyProps) {
  const { project, stats } = props;
  const numbers = insightNumbers(project, stats, dayKey(Date.now()));
  // The week and the last twelve weeks show once there is something in them.
  const hasWritten = Object.keys(stats).length > 0;
  return (
    <>
      <DayCard
        words={stats[numbers.today] ?? 0}
        goal={numbers.goals.dailyGoal}
        onGoals={props.onGoals}
      />
      <TowardsGoal numbers={numbers} />
      <JourneyCard
        summary={journeySummary(props.journey, numbers.today)}
        onOpen={props.onJourney}
      />
      {hasWritten && <WeekCard stats={stats} numbers={numbers} />}
      {hasWritten && (
        <Heatmap stats={stats} today={numbers.today} dailyGoal={numbers.goals.dailyGoal} />
      )}
      <Chapters project={project} />
      <WordsByStatus project={project} />
      <WordsByLabel project={project} />
    </>
  );
}

const InsightsHead = (props: {
  onClose: () => void;
  onGrab: ((event: PointerEvent<HTMLElement>) => void) | undefined;
}) => (
  <div className="insights-head block-head" onPointerDown={props.onGrab}>
    <span className="insights-title block-title">
      <GripIcon />
      {t("Insikter")}
    </span>
    <CloseButton label={t("Stäng insikter")} isPhoneBack onClose={props.onClose} />
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

// The book's last page, or the cards of the day, the week and the book.
function ShownPart(props: PanelProps & { isColophon: boolean; onOpen: (open: Open) => void }) {
  if (props.isColophon) return <Colophon project={props.project} stats={props.stats} />;
  return (
    <InsightsBody
      project={props.project}
      stats={props.stats}
      journey={props.journey}
      onGoals={() => props.onOpen("day")}
      onJourney={() => props.onOpen("journey")}
    />
  );
}

/** Insikter: beside the text, how the day, the week and the book are going. */
export function InsightsPanel(props: PanelProps) {
  const [open, setOpen] = useState<Open>(null);
  const [isColophon, setColophon] = useState(false);
  useEscape(() => !open && props.onClose());
  const hasStats = Object.keys(props.stats).length > 0;
  const floating = useFloating("insikter", !usePhone());
  return (
    <aside
      ref={floating.ref}
      className="insights-panel"
      aria-label={t("Insikter")}
      style={floating.style}
    >
      <InsightsHead onClose={props.onClose} onGrab={floating.onPointerDown} />
      <div className="insights-body">
        {hasStats && <ShownAs isColophon={isColophon} onChange={setColophon} />}
        {!hasStats && <NoStats onWrite={props.onClose} />}
        <ShownPart {...props} isColophon={isColophon} onOpen={setOpen} />
        <button className="link-button quiet" onClick={() => setOpen("goals")}>
          {t("Ändra mål och deadline")}
        </button>
      </div>
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
