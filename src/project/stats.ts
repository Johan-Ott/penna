import { parseMarkdown } from "../manuscript/parseMarkdown.js";
import { splitSceneFile } from "../manuscript/sceneFile.js";
import { countDocumentWords } from "../manuscript/wordCount.js";
import { writeAtomic } from "../storage/atomicWrite.js";
import { joinPath, type FileSystem } from "../storage/fileSystem.js";

/** stats.json: words written per day, as { "2026-10-02": 812 }. */
export type Stats = Record<string, number>;

const DAY = 24 * 60 * 60 * 1000;

export function dayKey(time: number): string {
  const date = new Date(time);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Day keys are stepped in UTC, so a summer time change never skips or repeats a day.
const dayBefore = (key: string) =>
  new Date(Date.parse(`${key}T00:00:00Z`) - DAY).toISOString().slice(0, 10);

const bodyWords = (sceneText: string) =>
  countDocumentWords(parseMarkdown(splitSceneFile(sceneText).body));

/** What one save of a scene added, so moving or trashing scenes never counts as writing. */
export const wordsAdded = (before: string, after: string) => bodyWords(after) - bodyWords(before);

export const addWritten = (stats: Stats, day: string, words: number): Stats => ({
  ...stats,
  [day]: Math.max(0, (stats[day] ?? 0) + words),
});

/** Days in a row with words written. Today only breaks the streak once it is over. */
export function streak(stats: Stats, today: string): number {
  let day = (stats[today] ?? 0) > 0 ? today : dayBefore(today);
  let days = 0;
  while ((stats[day] ?? 0) > 0) {
    days++;
    day = dayBefore(day);
  }
  return days;
}

const statsPath = (dir: string) => joinPath(dir, "stats.json");

export async function readStats(fileSystem: FileSystem, dir: string): Promise<Stats> {
  try {
    const parsed: unknown = JSON.parse(await fileSystem.readText(statsPath(dir)));
    if (typeof parsed !== "object" || parsed === null) return {};
    const entries = Object.entries(parsed).filter(([, words]) => typeof words === "number");
    return Object.fromEntries(entries) as Stats;
  } catch {
    return {};
  }
}

export const writeStats = (fileSystem: FileSystem, dir: string, stats: Stats) =>
  writeAtomic(fileSystem, statsPath(dir), `${JSON.stringify(stats, null, 2)}\n`);

export function dailyGoalOf(fields: Record<string, unknown>): number | null {
  const goal = fields["dailyGoal"];
  return typeof goal === "number" && goal > 0 ? goal : null;
}
