import { useEffect, useRef, useState } from "react";
import {
  newStickyNote,
  readStickyNotes,
  writeStickyNotes,
  type StickyNote,
} from "../../project/stickyNotes.js";
import { recordFailure } from "@llkit/errorLog.js";
import { platform } from "../platform.js";

const SAVE_DELAY = 600;

// Read when the book opens; a file that could not be read leaves `notes` null, and is then never
// written over. What waits to be saved is saved when the book closes.
function useLoaded(dir: string, pending: React.RefObject<StickyNote[] | null>) {
  const [notes, setNotes] = useState<StickyNote[] | null>(null);
  useEffect(() => {
    let isCurrent = true;
    readStickyNotes(platform.fileSystem, dir)
      .then((read) => isCurrent && setNotes(read))
      .catch(recordFailure("Lappar"));
    return () => {
      isCurrent = false;
      if (pending.current) void writeStickyNotes(platform.fileSystem, dir, pending.current);
    };
  }, [dir, pending]);
  return [notes, setNotes] as const;
}

/** The book's notes, saved a moment after each change; each change builds on the last. */
export function useStickyNotes(dir: string) {
  const pending = useRef<StickyNote[] | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [notes, setNotes] = useLoaded(dir, pending);
  const shown = useRef<StickyNote[]>([]);
  shown.current = pending.current ?? notes ?? [];
  const save = (next: StickyNote[]) => {
    if (notes === null) return;
    shown.current = pending.current = next;
    setNotes(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      pending.current = null;
      writeStickyNotes(platform.fileSystem, dir, next).catch(recordFailure("Lappar"));
    }, SAVE_DELAY);
  };
  return {
    notes,
    change: (id: string, part: Partial<StickyNote>) =>
      save(shown.current.map((note) => (note.id === id ? { ...note, ...part } : note))),
    add: (place: { left: number; top: number }, color?: StickyNote["color"]) =>
      save([...shown.current, newStickyNote(place, color)]),
    remove: (id: string) => save(shown.current.filter((note) => note.id !== id)),
    restore: (note: StickyNote) => save([...shown.current, note]),
  };
}

export type StickyNotesState = ReturnType<typeof useStickyNotes>;
