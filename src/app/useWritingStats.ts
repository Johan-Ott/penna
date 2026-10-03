import { useCallback, useEffect, useRef, useState } from "react";
import {
  addWritten,
  dailyGoalOf,
  dayKey,
  readStats,
  streak,
  wordsAdded,
  writeStats,
  type Stats,
} from "../project/stats.js";
import { platform } from "./platform.js";
import type { Project } from "./useProject.js";

export interface Today {
  words: number;
  goal: number | null;
  streak: number;
}

function todayOf(stats: Stats, project: Project | null): Today {
  const today = dayKey(Date.now());
  return {
    words: stats[today] ?? 0,
    goal: project ? dailyGoalOf(project.fields) : null,
    streak: streak(stats, today),
  };
}

/** Words written per day, kept in the project's stats.json, and today's numbers from it. */
export function useWritingStats(project: Project | null) {
  const dir = project?.dir ?? null;
  const [stats, setStats] = useState<Stats>({});
  const queue = useRef(Promise.resolve());
  useEffect(() => {
    setStats({});
    if (dir) void readStats(platform.fileSystem, dir).then(setStats);
  }, [dir]);
  // Read, add and write in turn, so another device's words that day are kept too. A failed
  // write only loses a count, never text, so it is not shown as a save error.
  const recordSave = useCallback(
    (sceneDir: string, before: string, after: string) => {
      const added = wordsAdded(before, after);
      if (added === 0) return;
      queue.current = queue.current
        .then(async () => {
          const day = dayKey(Date.now());
          const next = addWritten(await readStats(platform.fileSystem, sceneDir), day, added);
          await writeStats(platform.fileSystem, sceneDir, next);
          if (sceneDir === dir) setStats(next);
        })
        .catch(() => undefined);
    },
    [dir],
  );
  return { stats, today: todayOf(stats, project), recordSave };
}
