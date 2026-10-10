import { useSyncExternalStore } from "react";
import { platform, type AppUpdate } from "./platform.js";

// The update Penna has found, shared by the notice and the menus' Sök efter uppdateringar.

interface Updates {
  update: AppUpdate | null;
  /** Asked by hand and nothing newer was found, so the writer is told so. */
  isLatest: boolean;
}

let current: Updates = { update: null, isLatest: false };
const listeners = new Set<() => void>();

function show(next: Updates) {
  current = next;
  listeners.forEach((listener) => listener());
}

/** Quiet offline or failing; asked by hand, "nothing newer" is said too. */
export async function checkForUpdates(isAsked = false) {
  const update = await platform.checkForUpdate().catch(() => null);
  show({ update, isLatest: isAsked && !update });
}

export const dismissUpdates = () => show({ update: null, isLatest: false });

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

export const useUpdates = () => useSyncExternalStore(subscribe, () => current);
