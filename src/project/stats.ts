import { parseMarkdown } from "../manuscript/parseMarkdown.js";
import { splitSceneFile } from "../manuscript/sceneFile.js";
import { countDocumentWords } from "../manuscript/wordCount.js";
import { writeAtomic } from "../storage/atomicWrite.js";
import { joinPath, type FileSystem } from "../storage/fileSystem.js";

/** Words written per day, as { "2026-10-02": 812 }. */
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

/** Only what a save added, so moving or trashing scenes never counts as writing. */
export const wordsAdded = (before: string, after: string) => bodyWords(after) - bodyWords(before);

export const addWritten = (stats: Stats, day: string, words: number): Stats => ({
  ...stats,
  [day]: Math.max(0, (stats[day] ?? 0) + words),
});

/** Today only breaks the streak once it is over. */
export function streak(stats: Stats, today: string): number {
  let day = (stats[today] ?? 0) > 0 ? today : dayBefore(today);
  let days = 0;
  while ((stats[day] ?? 0) > 0) {
    days++;
    day = dayBefore(day);
  }
  return days;
}

// One file per device, so two devices never write the same file. stats.json is the older shared one.
const sharedPath = (dir: string) => joinPath(dir, "stats.json");
const devicePath = (dir: string, device: string) => joinPath(dir, `stats/${device}.json`);

async function readStatsFile(fileSystem: FileSystem, path: string): Promise<Stats> {
  try {
    const parsed: unknown = JSON.parse(await fileSystem.readText(path));
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    const entries = Object.entries(parsed).filter(([, words]) => typeof words === "number");
    return Object.fromEntries(entries) as Stats;
  } catch {
    return {};
  }
}

const addUp = (all: Stats[]): Stats =>
  all.reduce<Stats>((sum, stats) => {
    for (const [day, words] of Object.entries(stats)) sum[day] = (sum[day] ?? 0) + words;
    return sum;
  }, {});

export async function readStats(fileSystem: FileSystem, dir: string): Promise<Stats> {
  const names = await fileSystem.list(joinPath(dir, "stats")).catch(() => []);
  const paths = names
    .filter((name) => name.endsWith(".json"))
    .map((name) => joinPath(dir, `stats/${name}`));
  return addUp(
    await Promise.all([sharedPath(dir), ...paths].map((path) => readStatsFile(fileSystem, path))),
  );
}

export const readDeviceStats = (fileSystem: FileSystem, dir: string, device: string) =>
  readStatsFile(fileSystem, devicePath(dir, device));

export async function writeDeviceStats(
  fileSystem: FileSystem,
  dir: string,
  device: string,
  stats: Stats,
) {
  await fileSystem.makeDir(joinPath(dir, "stats"));
  await writeAtomic(
    fileSystem,
    devicePath(dir, device),
    `${JSON.stringify(stats, null, 2)}
`,
  );
}

export function dailyGoalOf(fields: Record<string, unknown>): number | null {
  const goal = fields["dailyGoal"];
  return typeof goal === "number" && goal > 0 ? goal : null;
}
