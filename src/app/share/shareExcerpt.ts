import { useSyncExternalStore } from "react";

// The selection bar goes away when the dialog takes the focus, so the excerpt waits here.
let shown: string | null = null;
const listeners = new Set<() => void>();
const tell = () => listeners.forEach((listener) => listener());

export const openExcerpt = (text: string) => ((shown = text), tell());
export const closeExcerpt = () => ((shown = null), tell());

export function useShownExcerpt() {
  return useSyncExternalStore(
    (listener) => (listeners.add(listener), () => listeners.delete(listener)),
    () => shown,
  );
}
