import { useSyncExternalStore } from "react";
import { browserStorage } from "../storage/browserStorage.js";

// A guide for a new user: a small tip in each part of an app the first time they come there, one
// at a time. Seen tips stay seen per computer, and the guide can be skipped or started over.

export interface GuideStep {
  id: string;
  /** Short, for the breadcrumb of steps over the tip. */
  name: string;
  text: string;
}

interface GuideState {
  isOff: boolean;
  seen: string[];
}

function stored(storageKey: string): GuideState {
  try {
    const read = JSON.parse(browserStorage().getItem(storageKey) ?? "{}") as Partial<GuideState>;
    return { isOff: false, seen: [], ...read };
  } catch {
    return { isOff: false, seen: [] };
  }
}

// What has been seen, kept under `storageKey`, with a version that changes on every change.
function savedState(storageKey: string) {
  const listeners = new Set<() => void>();
  let state = stored(storageKey);
  let version = 0;
  const changed = () => {
    version += 1;
    listeners.forEach((listener) => listener());
  };
  return {
    get: () => state,
    version: () => version,
    changed,
    save(next: GuideState) {
      state = next;
      browserStorage().setItem(storageKey, JSON.stringify(next));
      changed();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function createGuide(steps: readonly GuideStep[], storageKey: string) {
  const saved = savedState(storageKey);
  // The tips on screen now; only the first of them in the guide's order shows.
  const mounted = new Set<string>();
  const isSeen = (id: string) => saved.get().seen.includes(id);
  return {
    steps,
    isSeen,
    markSeen: (id: string) => saved.save({ ...saved.get(), seen: [...saved.get().seen, id] }),
    skip: () => saved.save({ ...saved.get(), isOff: true }),
    restart: () => saved.save({ isOff: false, seen: [] }),
    /** Registers a tip as on screen, and gives back the call that takes it off again. */
    mount(id: string) {
      mounted.add(id);
      saved.changed();
      return () => (mounted.delete(id), saved.changed());
    },
    /** The one tip to show now, if the guide is on and a tip on screen is still unseen. */
    useShowing() {
      useSyncExternalStore(saved.subscribe, saved.version);
      if (saved.get().isOff) return undefined;
      return steps.find(({ id }) => mounted.has(id) && !isSeen(id))?.id;
    },
  };
}

export type Guide = ReturnType<typeof createGuide>;
