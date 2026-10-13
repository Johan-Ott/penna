import { useEffect, useState, type PointerEvent, type RefObject } from "react";
import type { StickyNote } from "../../project/stickyNotes.js";
import type { StickyNotesState } from "./useStickyNotes.js";

type Box = { left: number; top: number; width: number; height: number };
type Card = RefObject<HTMLElement | null>;

/** The size of what the notes lie over, followed as the window is made larger or smaller. */
export function useRoomSize(card: Card) {
  const [room, setRoom] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const parent = card.current?.offsetParent;
    if (!(parent instanceof HTMLElement)) return;
    const measure = () => setRoom({ width: parent.clientWidth, height: parent.clientHeight });
    const observer = new ResizeObserver(measure);
    observer.observe(parent);
    return () => observer.disconnect();
  }, [card]);
  return room;
}

/** Moved by its head from where it shows, and kept inside the room. */
export function useNoteDrag(note: StickyNote, shown: Box, state: StickyNotesState) {
  return (event: PointerEvent<HTMLElement>) => {
    const card = event.currentTarget.parentElement;
    if (!card || (event.target as HTMLElement).closest("button")) return;
    event.preventDefault();
    const room = card.offsetParent?.getBoundingClientRect();
    const grab = { x: event.clientX - shown.left, y: event.clientY - shown.top };
    const within = (value: number, room: number, size: number) =>
      Math.max(0, Math.min(value, room - size));
    const move = (moved: globalThis.PointerEvent) => {
      const left = within(moved.clientX - grab.x, room?.width ?? 2000, card.offsetWidth);
      const top = within(moved.clientY - grab.y, room?.height ?? 2000, card.offsetHeight);
      state.change(note.id, { left, top });
    };
    const drop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", drop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", drop);
  };
}

// Only a size the writer drags the corner to is kept: one made smaller to fit the window is not.
export function useKeptSize(card: Card, note: StickyNote, shown: Box, state: StickyNotesState) {
  useEffect(() => {
    const element = card.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      const width = element.offsetWidth;
      const height = element.offsetHeight;
      if (width !== shown.width || height !== shown.height)
        state.change(note.id, { width, height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  });
}
