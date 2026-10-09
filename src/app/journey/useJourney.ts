import { useCallback, useEffect, useRef, useState } from "react";
import { celebrationsBetween, goalReached, journeySummary } from "../../project/inkwell.js";
import {
  INK,
  mergedJourney,
  NO_JOURNEY,
  withHoliday,
  withInk,
  withWords,
  type Journey,
} from "../../project/journey.js";
import { dayKey } from "../../project/stats.js";
import { recordFailure } from "../errorLog.js";
import { platform } from "../platform.js";
import { thisDevice } from "../useWritingStats.js";
import { celebrate, takeInk } from "./journeyEvents.js";
import { libraryOf, readJourneys, writeOwnJourney } from "./journeyFile.js";

interface Loaded {
  library: string;
  own: Journey;
  others: Journey;
}

function useLoadedJourney(libraryDir: string | null) {
  const loaded = useRef<Loaded | null>(null);
  const [journey, setJourney] = useState(NO_JOURNEY);
  useEffect(() => {
    loaded.current = null;
    void (async () => {
      const library = await libraryOf(libraryDir);
      const { own, others } = await readJourneys(platform.fileSystem, library, thisDevice());
      loaded.current = { library, own, others };
      const all = mergedJourney([own, others]);
      setJourney(all);
    })().catch(recordFailure("Skrivresan kunde inte läsas"));
  }, [libraryDir]);
  return { loaded, journey, setJourney };
}

type Change = (update: (own: Journey, today: string) => Journey, isGoalReached?: boolean) => void;

// Saved one change at a time; what the change reached is celebrated.
function useJourneyChange(
  loaded: { current: Loaded | null },
  setJourney: (journey: Journey) => void,
): Change {
  const queue = useRef(Promise.resolve());
  return useCallback(
    (update, isGoalReached = false) => {
      queue.current = queue.current
        .then(async () => {
          const current = loaded.current;
          if (!current) return;
          const today = dayKey(Date.now());
          const before = journeySummary(mergedJourney([current.own, current.others]), today);
          const own = update(current.own, today);
          await writeOwnJourney(platform.fileSystem, current.library, thisDevice(), own);
          loaded.current = { ...current, own };
          const all = mergedJourney([own, current.others]);
          setJourney(all);
          if (isGoalReached) celebrate(goalReached(all.words[today] ?? 0));
          celebrationsBetween(before, journeySummary(all, today)).forEach(celebrate);
        })
        .catch(recordFailure("Skrivresan kunde inte sparas"));
    },
    [loaded, setJourney],
  );
}

/** The writer's journey in every book, on every device. */
export function useJourney(libraryDir: string | null) {
  const { loaded, journey, setJourney } = useLoadedJourney(libraryDir);
  const change = useJourneyChange(loaded, setJourney);
  useEffect(() => {
    takeInk((points) => change((own, today) => withInk(own, today, points)));
    return () => takeInk(null);
  }, [change]);
  return {
    journey,
    /** Words a save added; reaching the book's daily goal gives its ink once. */
    record: (words: number, isGoalReached: boolean) =>
      change((own, today) => {
        const written = withWords(own, today, words);
        return isGoalReached ? withInk(written, today, INK.goal) : written;
      }, isGoalReached),
    setHoliday: (isOn: boolean) => change((own, today) => withHoliday(own, isOn, today)),
  };
}

export type JourneyState = ReturnType<typeof useJourney>;
