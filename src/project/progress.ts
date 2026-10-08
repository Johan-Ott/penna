import { MONTHS } from "./snapshots.js";
import { dailyGoalOf, type Stats } from "./stats.js";

const DAY = 24 * 60 * 60 * 1000;
const AVERAGE_DAYS = 30;
const HEATMAP_WEEKS = 12;

// Day keys are counted in UTC, so a summer time change never adds or loses a day.
const utcOf = (day: string) => Date.parse(`${day}T00:00:00Z`);
const dayAfter = (day: string, days: number) =>
  new Date(utcOf(day) + days * DAY).toISOString().slice(0, 10);

export const daysBetween = (from: string, to: string) =>
  Math.round((utcOf(to) - utcOf(from)) / DAY);

export interface ProjectGoals {
  dailyGoal: number | null;
  /** The length the finished manuscript is aimed at, in words. */
  totalGoal: number | null;
  /** YYYY-MM-DD. */
  deadline: string | null;
}

export function projectGoals(fields: Record<string, unknown>): ProjectGoals {
  const total = fields["totalGoal"];
  const deadline = fields["deadline"];
  return {
    dailyGoal: dailyGoalOf(fields),
    totalGoal: typeof total === "number" && total > 0 ? total : null,
    deadline: typeof deadline === "string" && /^\d{4}-\d\d-\d\d$/.test(deadline) ? deadline : null,
  };
}

/** The words left spread over the days left, rounded up. Null without both a goal and a deadline. */
export function deadlinePlan(
  manuscript: { words: number; goal: number | null; deadline: string | null },
  today: string,
  averagePerDay: number,
) {
  const { words, goal, deadline } = manuscript;
  if (goal === null || deadline === null) return null;
  const daysLeft = Math.max(0, daysBetween(today, deadline));
  const wordsLeft = Math.max(0, goal - words);
  const wordsPerDay = daysLeft === 0 ? wordsLeft : Math.ceil(wordsLeft / daysLeft);
  return { daysLeft, wordsPerDay, isOnTrack: wordsLeft === 0 || averagePerDay >= wordsPerDay };
}

/** Over the last 30 days, today included, counting days without words too. */
export function averagePerDay(stats: Stats, today: string): number {
  // A book begun this week is averaged over this week, not over a month it did not exist.
  const first = Object.keys(stats)
    .filter((day) => (stats[day] ?? 0) > 0)
    .sort()[0];
  if (!first) return 0;
  const days = Math.min(AVERAGE_DAYS, Math.max(1, daysBetween(first, today) + 1));
  let sum = 0;
  for (let back = 0; back < days; back++) sum += stats[dayAfter(today, -back)] ?? 0;
  return Math.round(sum / days);
}

export interface HeatmapCell {
  day: string;
  words: number;
  /** 0 to 4 by share of the daily goal; null for days still to come. */
  level: number | null;
}

function levelOf(words: number, goal: number): number {
  if (words <= 0) return 0;
  return Math.min(4, 1 + Math.floor((2 * words) / goal));
}

/** A column per week, starting on Monday. */
export function heatmap(stats: Stats, today: string, dailyGoal: number | null): HeatmapCell[] {
  const weekday = (new Date(utcOf(today)).getUTCDay() + 6) % 7;
  const start = dayAfter(today, -weekday - 7 * (HEATMAP_WEEKS - 1));
  const goal = dailyGoal ?? Math.max(1, ...Object.values(stats));
  return Array.from({ length: HEATMAP_WEEKS * 7 }, (_unused, index) => {
    const day = dayAfter(start, index);
    const words = stats[day] ?? 0;
    return { day, words, level: day > today ? null : levelOf(words, goal) };
  });
}

/** "15 jan" for 2027-01-15. */
export function shortDay(day: string): string {
  const [, month = 1, date = 1] = day.split("-").map(Number);
  return `${date} ${MONTHS[month - 1] ?? ""}`;
}

/** The day the first draft reaches its goal at the writer's pace; null without a goal or a pace. */
export function finishDay(words: number, goal: number | null, perDay: number, today: string) {
  if (!goal || perDay <= 0) return null;
  return dayAfter(today, Math.ceil(Math.max(0, goal - words) / perDay));
}
