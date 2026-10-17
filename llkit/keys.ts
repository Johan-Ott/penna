import { useEffect, useRef } from "react";

interface ShortcutOptions {
  alt?: boolean;
  shift?: boolean;
}

/** Ctrl+key (Cmd on macOS). Alt and Shift must match exactly. */
export function useShortcut(key: string, action: () => void, options: ShortcutOptions = {}) {
  const actionRef = useRef(action);
  actionRef.current = action;
  const needsAlt = options.alt === true;
  const needsShift = options.shift === true;
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const hasModifier = event.ctrlKey || event.metaKey;
      const modifiersMatch = event.altKey === needsAlt && event.shiftKey === needsShift;
      if (!hasModifier || !modifiersMatch || event.key.toLowerCase() !== key) return;
      event.preventDefault();
      actionRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [key, needsAlt, needsShift]);
}

// ProseMirror prevents every Escape typed in the text, so that one still counts as unhandled.
const isFromEditor = (event: KeyboardEvent) =>
  event.target instanceof Element && event.target.closest(".ProseMirror") !== null;

/** Unless something closer to the focus already handled Escape. */
export function useEscape(action: () => void) {
  const actionRef = useRef(action);
  actionRef.current = action;
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isHandled = event.defaultPrevented && !isFromEditor(event);
      if (event.key !== "Escape" || isHandled) return;
      actionRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}

// Keys typed into the manuscript or a field are text, not commands.
const isTyping = (event: KeyboardEvent) => {
  const target = event.target as HTMLElement | null;
  const hasModifier = event.ctrlKey || event.metaKey || event.altKey;
  return hasModifier || !target || target.isContentEditable || !!target.closest("input, textarea");
};

const GO_WAIT_MS = 1000;

/** G and then a letter, when nothing is being typed. `onLetter` says whether the letter led somewhere. */
export function useGoKeys(onLetter: (letter: string) => boolean) {
  const onLetterRef = useRef(onLetter);
  onLetterRef.current = onLetter;
  useEffect(() => {
    let isWaiting = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTyping(event)) return;
      if (isWaiting && onLetterRef.current(event.key.toLowerCase())) event.preventDefault();
      isWaiting = event.key.toLowerCase() === "g";
      clearTimeout(timer);
      timer = setTimeout(() => (isWaiting = false), GO_WAIT_MS);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
