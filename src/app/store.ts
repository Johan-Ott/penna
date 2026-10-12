import { useSyncExternalStore } from "react";

/** A value kept outside React: any part of the app sets it, and every reader draws again. */
export function createStore<T>(initial: T) {
  let value = initial;
  const listeners = new Set<() => void>();
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => void listeners.delete(listener);
  };
  return {
    get: () => value,
    set: (next: T) => {
      value = next;
      listeners.forEach((listener) => listener());
    },
    use: () => useSyncExternalStore(subscribe, () => value),
  };
}
