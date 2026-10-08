import { useSyncExternalStore } from "react";

/** Where the writer last wrote in a book: the scene, the cursor and when. */
export interface Place {
  sceneId: string;
  position: number;
  /** The words just before the cursor, which find the place again if the position moved. */
  before: string;
  /** Milliseconds since 1970. */
  writtenAt: number;
}

// Kept in localStorage, per device: where you left off on this computer.
const KEY = "penna.lastPlace";

function places(): Record<string, Place> {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return typeof stored === "object" && stored !== null ? (stored as Record<string, Place>) : {};
  } catch {
    return {};
  }
}

export function rememberPlace(dir: string, place: Place) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...places(), [dir]: place }));
  } catch {
    // Without storage the book opens at its first scene, as before.
  }
}

export function placeIn(dir: string): Place | null {
  const place = places()[dir];
  return place && typeof place.sceneId === "string" && typeof place.position === "number"
    ? place
    : null;
}

// The opening picture waits here until the writer starts writing.
let shown: Place | null = null;
const listeners = new Set<() => void>();
const tell = () => listeners.forEach((listener) => listener());

export const showResume = (place: Place | null) => ((shown = place), tell());

export function useResume() {
  return useSyncExternalStore(
    (listener) => (listeners.add(listener), () => listeners.delete(listener)),
    () => shown,
  );
}
