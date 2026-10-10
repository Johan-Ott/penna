import { useSyncExternalStore } from "react";

// A writing sprint: a set time to write in, and the words written during it. Started from
// Insikter or the palette, shown over the text, wherever it was started from.

export interface Sprint {
  minutes: number;
  endsAt: number;
  /** The day's words when the sprint began; set by the bar the first time it is drawn. */
  startWords: number | null;
}

interface SprintState {
  sprint: Sprint | null;
  /** The last sprint's result, shown until it is closed. */
  done: { minutes: number; words: number } | null;
}

let current: SprintState = { sprint: null, done: null };
const listeners = new Set<() => void>();

function show(next: SprintState) {
  current = next;
  listeners.forEach((listener) => listener());
}

export const SPRINT_LENGTHS = [15, 25, 45];

export const startSprint = (minutes: number) =>
  show({
    sprint: { minutes, endsAt: Date.now() + minutes * 60_000, startWords: null },
    done: null,
  });

export function setStartWords(words: number) {
  if (current.sprint) show({ ...current, sprint: { ...current.sprint, startWords: words } });
}

export function endSprint(words: number) {
  const minutes = current.sprint?.minutes ?? 0;
  show({ sprint: null, done: { minutes, words } });
}

export const closeSprintResult = () => show({ sprint: null, done: null });

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

export const useSprint = () => useSyncExternalStore(subscribe, () => current);
