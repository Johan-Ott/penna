import { finishDay, shortDay, weekOf } from "../../project/progress.js";
import { streak, type Stats } from "../../project/stats.js";
import { numberLocale, t } from "../../i18n/i18n.js";
import type { Numbers } from "./insightNumbers.js";

const format = (words: number) => words.toLocaleString(numberLocale());
const RING = 2 * Math.PI * 30;

function dayTitle(words: number, goal: number) {
  if (words >= goal) return t("Dagens sida är skriven");
  if (words >= goal * 0.75) return t("Dagens sida är nästan skriven");
  return words > 0 ? t("På väg mot dagens sida") : t("Dagens sida väntar");
}

function dayText(words: number, goal: number | null) {
  if (!goal) return t("Sätt ett dagsmål, så räknar Penna mot det.");
  const done = t("{words} av {goal} ord.", { words: format(words), goal: format(goal) });
  if (words >= goal) return done;
  return `${done} ${t("{count} ord kvar.", { count: format(goal - words) })}`;
}

/** Today's words as a ring around the ink drop, and what is left of the day's goal. */
export function DayCard(props: { words: number; goal: number | null; onGoals: () => void }) {
  const { words, goal } = props;
  const share = goal ? Math.min(1, words / goal) : 0;
  return (
    <button className="insight-card insight-day" onClick={props.onGoals}>
      <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true">
        <circle className="ring-track" cx="36" cy="36" r="30" />
        <circle
          className="ring-done"
          cx="36"
          cy="36"
          r="30"
          strokeDasharray={`${share * RING} ${RING}`}
          transform="rotate(-90 36 36)"
        />
        <path
          className="ring-drop"
          d="M36 22 C44 31 47 37 47 42 C47 48 42 52 36 52 C30 52 25 48 25 42 C25 37 28 31 36 22 Z"
        />
      </svg>
      <span className="insight-heading">
        {goal ? dayTitle(words, goal) : t("{count} ord idag", { count: format(words) })}
      </span>
      <span className="insight-muted">{dayText(words, goal)}</span>
    </button>
  );
}

function goalLine(numbers: Numbers, share: number) {
  const finish = finishDay(numbers.words, numbers.goals.totalGoal, numbers.average, numbers.today);
  return finish
    ? t("{share} % · klart runt {day}", { share, day: shortDay(finish) })
    : t("{share} %", { share });
}

function deadlineLine({ plan, goals, average }: Numbers) {
  if (!plan || !goals.deadline) return null;
  if (plan.wordsPerDay === 0) return t("Slutmålet är nått.");
  return t("{needed} ord per dag räcker till {day}. Du skriver i snitt {average}.", {
    needed: format(plan.wordsPerDay),
    day: shortDay(goals.deadline),
    average: format(average),
  });
}

const Ticks = () => (
  <div className="insight-ticks" aria-hidden="true">
    {[0, 25, 50, 75, 100].map((tick) => (
      <span key={tick}>{tick}</span>
    ))}
  </div>
);

export function TowardsGoal({ numbers }: { numbers: Numbers }) {
  const goal = numbers.goals.totalGoal;
  if (!goal) return null;
  const share = Math.min(100, Math.round((100 * numbers.words) / goal));
  const deadline = deadlineLine(numbers);
  return (
    <section className="insight-card">
      <div className="insight-row">
        <span className="insight-title">{t("Mot slutmanus")}</span>
        <span className="insight-muted">
          {t("{words} av {goal} ord", { words: format(numbers.words), goal: format(goal) })}
        </span>
      </div>
      <span className="insight-text">{goalLine(numbers, share)}</span>
      <div
        className="progress-bar"
        role="progressbar"
        aria-label={t("Mot slutmanus")}
        aria-valuenow={share}
      >
        <div style={{ width: `${share}%` }} />
      </div>
      <Ticks />
      {deadline && <span className="insight-muted">{deadline}</span>}
    </section>
  );
}

const weekday = (day: string) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString(numberLocale(), {
    weekday: "narrow",
    timeZone: "UTC",
  });

// "·" for a day without words, "1,3k" from a thousand.
function shortWords(words: number) {
  if (words <= 0) return "·";
  if (words < 1000) return format(words);
  return `${(words / 1000).toLocaleString(numberLocale(), { maximumFractionDigits: 1 })}k`;
}

function barClass(words: number, best: number) {
  if (words === best) return "bar best";
  return words > 0 ? "bar" : "bar empty";
}

function DayBar({ day, words, best }: { day: string; words: number; best: number }) {
  return (
    <div className="insight-day-bar" title={`${shortDay(day)}: ${format(words)}`}>
      <span>{shortWords(words)}</span>
      <span className="bar-room">
        <span
          className={barClass(words, best)}
          style={{ height: `${Math.max(3, Math.round((words / best) * 56))}px` }}
        />
      </span>
      <span className="insight-muted">{weekday(day)}</span>
    </div>
  );
}

function paceLine(stats: Stats, numbers: Numbers) {
  const days = streak(stats, numbers.today);
  return t("{streak} i rad · i snitt {average} ord per dag", {
    streak: days === 1 ? t("1 dag") : t("{count} dagar", { count: days }),
    average: format(numbers.average),
  });
}

/** The words of each day this week; the best day in green. */
export function WeekCard({ stats, numbers }: { stats: Stats; numbers: Numbers }) {
  const week = weekOf(stats, numbers.today);
  const best = Math.max(1, ...week.map((day) => day.words));
  const total = week.reduce((sum, day) => sum + day.words, 0);
  return (
    <section className="insight-card">
      <div className="insight-row">
        <span className="insight-title">{t("Den här veckan")}</span>
        <span className="insight-muted">{t("{count} ord", { count: format(total) })}</span>
      </div>
      <div className="insight-week">
        {week.map((day) => (
          <DayBar key={day.day} day={day.day} words={day.words} best={best} />
        ))}
      </div>
      <span className="insight-muted">{paceLine(stats, numbers)}</span>
    </section>
  );
}
