import { useRef, useState, type TouchEvent } from "react";

// Touch, the way apps are expected to answer it: holding a finger on something opens the menu a
// right-click would, and a row can be swiped to the side.

const HOLD_MS = 500;
const STILL_PX = 10;

const held = { timer: 0, x: 0, y: 0, didOpen: false };

function startHolding(event: globalThis.TouchEvent) {
  const touch = event.touches[0];
  const target = event.target;
  held.didOpen = false;
  if (event.touches.length !== 1 || !touch || !(target instanceof Element)) return;
  if (target.closest('input, textarea, [contenteditable="true"]')) return;
  Object.assign(held, { x: touch.clientX, y: touch.clientY });
  held.timer = window.setTimeout(() => {
    held.didOpen = true;
    navigator.vibrate?.(10);
    const menu = { bubbles: true, cancelable: true, clientX: held.x, clientY: held.y };
    target.dispatchEvent(new MouseEvent("contextmenu", menu));
  }, HOLD_MS);
}

function moving(event: globalThis.TouchEvent) {
  const touch = event.touches[0];
  if (touch && Math.hypot(touch.clientX - held.x, touch.clientY - held.y) > STILL_PX)
    clearTimeout(held.timer);
}

/** Holding still on anything opens its right-click menu; text keeps the phone's own selection. */
export function longPressOpensMenus() {
  document.addEventListener("touchstart", startHolding, { passive: true });
  document.addEventListener("touchmove", moving, { passive: true });
  // The finger lifting after the menu opened is not also a tap on what is under it.
  document.addEventListener("touchend", (event) => {
    clearTimeout(held.timer);
    if (held.didOpen) event.preventDefault();
  });
  document.addEventListener("touchcancel", () => clearTimeout(held.timer));
  // Where the web view opens a menu of its own on a long press, the app's has already opened.
  document.addEventListener("contextmenu", (event) => {
    if (event.isTrusted && held.didOpen) event.preventDefault();
  });
}

const SWIPE_PX = 80;
const FARTHEST_PX = 120;

const sideOf = (offset: number): "left" | "right" | null => {
  if (offset < 0) return "left";
  return offset > 0 ? "right" : null;
};

/** A row that follows the finger sideways, and does `onLeft` or `onRight` past a short way. */
export function useSwipe(onLeft?: () => void, onRight?: () => void) {
  const [offset, setOffset] = useState(0);
  const start = useRef<{ x: number; y: number; isSideways: boolean | null } | null>(null);
  const reach = (across: number) =>
    Math.max(onLeft ? -FARTHEST_PX : 0, Math.min(onRight ? FARTHEST_PX : 0, across));
  const handlers = {
    onTouchStart: (event: TouchEvent) => {
      const touch = event.touches[0];
      if (touch) start.current = { x: touch.clientX, y: touch.clientY, isSideways: null };
    },
    onTouchMove: (event: TouchEvent) => {
      const touch = event.touches[0];
      const from = start.current;
      if (!touch || !from) return;
      const across = touch.clientX - from.x;
      const down = touch.clientY - from.y;
      // The first clear direction decides: a scroll down the list never turns into a swipe.
      if (from.isSideways === null && Math.hypot(across, down) > STILL_PX)
        from.isSideways = Math.abs(across) > Math.abs(down);
      if (from.isSideways) setOffset(reach(across));
    },
    onTouchEnd: () => {
      if (offset <= -SWIPE_PX) onLeft?.();
      if (offset >= SWIPE_PX) onRight?.();
      start.current = null;
      setOffset(0);
    },
  };
  return { offset, handlers, side: sideOf(offset) };
}

/** Keeps --visible-height at the part of the screen not under a phone's keyboard, for dialogs. */
export function followVisibleHeight() {
  const view = window.visualViewport;
  if (!view) return;
  const set = () =>
    document.documentElement.style.setProperty("--visible-height", `${view.height}px`);
  view.addEventListener("resize", set);
  set();
}
