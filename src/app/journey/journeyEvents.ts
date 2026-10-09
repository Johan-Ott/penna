import { useSyncExternalStore } from "react";
import type { Celebration } from "../../project/inkwell.js";

// Celebrations wait here for the corner to show them, and ink earned anywhere in the app is
// handed to the journey, which saves it.
let shown: Celebration[] = [];
const listeners = new Set<() => void>();
const tell = () => listeners.forEach((listener) => listener());
let inkTaker: ((points: number) => void) | null = null;

export const celebrate = (celebration: Celebration) => ((shown = [...shown, celebration]), tell());
export const dismissCelebration = (celebration: Celebration) => (
  (shown = shown.filter((each) => each !== celebration)),
  tell()
);

export function useCelebrations() {
  return useSyncExternalStore(
    (listener) => (listeners.add(listener), () => listeners.delete(listener)),
    () => shown,
  );
}

export const earnInk = (points: number) => inkTaker?.(points);
export const takeInk = (taker: ((points: number) => void) | null) => void (inkTaker = taker);

// Badges unlocked where something happens, such as an export, are handed to the journey too.
let badgeTaker: ((id: string) => void) | null = null;
export const earnBadge = (id: string) => badgeTaker?.(id);
export const takeBadge = (taker: ((id: string) => void) | null) => void (badgeTaker = taker);
