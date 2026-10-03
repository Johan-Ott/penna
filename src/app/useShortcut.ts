import { useEffect, useRef } from "react";

interface ShortcutOptions {
  alt?: boolean;
  shift?: boolean;
}

/** Runs `action` on Ctrl+key (Cmd+key on macOS). Alt and Shift must match exactly. */
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

/** Runs `action` on Escape unless something closer to the focus already handled it. */
export function useEscape(action: () => void) {
  const actionRef = useRef(action);
  actionRef.current = action;
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      actionRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
