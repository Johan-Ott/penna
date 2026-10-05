import { useCallback, useEffect, useRef, useState } from "react";
import {
  addWritten,
  dailyGoalOf,
  dayKey,
  readDeviceStats,
  readStats,
  streak,
  wordsAdded,
  writeDeviceStats,
  type Stats,
} from "../project/stats.js";
import { recordFailure } from "./errorLog.js";
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

// Made once at random and kept in localStorage.
function thisDevice() {
  const key = "penna.device";
  try {
    const known = localStorage.getItem(key);
    if (known) return known;
    const made = crypto.randomUUID().slice(0, 8);
    localStorage.setItem(key, made);
    return made;
  } catch {
    return "enhet";
  }
}

async function addToThisDevice(dir: string, added: number) {
  const { fileSystem } = platform;
  const device = thisDevice();
  const own = await readDeviceStats(fileSystem, dir, device);
  await writeDeviceStats(fileSystem, dir, device, addWritten(own, dayKey(Date.now()), added));
  return readStats(fileSystem, dir);
}

export function useWritingStats(project: Project | null) {
  const dir = project?.dir ?? null;
  const [stats, setStats] = useState<Stats>({});
  const queue = useRef(Promise.resolve());
  useEffect(() => {
    setStats({});
    if (dir) void readStats(platform.fileSystem, dir).then(setStats);
  }, [dir]);
  // A failed write only loses a count, never text, so it is not shown as a save error.
  const recordSave = useCallback(
    (sceneDir: string, before: string, after: string) => {
      const added = wordsAdded(before, after);
      if (added === 0) return;
      queue.current = queue.current
        .then(async () => {
          const stats = await addToThisDevice(sceneDir, added);
          if (sceneDir === dir) setStats(stats);
        })
        .catch(recordFailure("Ord per dag kunde inte sparas"));
    },
    [dir],
  );
  return { stats, today: todayOf(stats, project), recordSave };
}
