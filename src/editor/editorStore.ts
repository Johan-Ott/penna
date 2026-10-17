import type { Node } from "prosemirror-model";
import type { EditorState } from "prosemirror-state";
import { useEffect, useState, useSyncExternalStore } from "react";

// The editor's state as a store: only what shows the text listens to it, so the rest of the app
// is not drawn again on every key typed.

export interface EditorStore {
  get: () => EditorState | null;
  set: (state: EditorState | null) => void;
  subscribe: (listener: () => void) => () => void;
}

export function createEditorStore(): EditorStore {
  let current: EditorState | null = null;
  const listeners = new Set<() => void>();
  return {
    get: () => current,
    set: (state) => {
      current = state;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** The editor's state now; the component is drawn again on every change. */
export const useEditorState = ({ store }: { store: EditorStore }) =>
  useSyncExternalStore(store.subscribe, store.get);

/** The text as it was at the writer's last pause of `pauseMs`, for what need not follow each key. */
export function useSettledDoc({ store }: { store: EditorStore }, pauseMs: number) {
  const [doc, setDoc] = useState<Node | null>(() => store.get()?.doc ?? null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const settle = () => setDoc(store.get()?.doc ?? null);
    const unsubscribe = store.subscribe(() => {
      clearTimeout(timer);
      timer = setTimeout(settle, pauseMs);
    });
    settle();
    return () => (unsubscribe(), clearTimeout(timer));
  }, [store, pauseMs]);
  return doc;
}
