import { writeAtomic } from "../storage/atomicWrite.js";
import { joinPath, readIfThere, type FileSystem } from "../storage/fileSystem.js";
import { newSceneId } from "../storage/sceneId.js";

// Lappar: post-it notes over the text, written in or drawn on, in the book's own folder so they
// sync and are backed up with it. The old Kladdlapp's text becomes the first note.

export const NOTE_COLORS = ["gul", "rosa", "mint", "himmel", "lavendel"] as const;
export type NoteColor = (typeof NOTE_COLORS)[number];

/** A line drawn with the pen, as points in the note's own pixels. */
export type Stroke = [number, number][];

export interface StickyNote {
  id: string;
  color: NoteColor;
  text: string;
  strokes: Stroke[];
  left: number;
  top: number;
  width: number;
  height: number;
}

const NOTES_FILE = "lappar.json";
const OLD_SCRATCH = "kladdlapp.md";

export function newStickyNote(place: { left: number; top: number }, color: NoteColor = "gul") {
  const note: StickyNote = {
    id: newSceneId(),
    color,
    text: "",
    strokes: [],
    width: 200,
    height: 180,
    ...place,
  };
  return note;
}

const isNote = (value: unknown): value is StickyNote =>
  typeof value === "object" && value !== null && typeof (value as StickyNote).id === "string";

/** The book's notes; a book that has only the old Kladdlapp gets it as its first note. */
export async function readStickyNotes(fileSystem: FileSystem, dir: string) {
  const text = await readIfThere(fileSystem, joinPath(dir, NOTES_FILE));
  if (text !== null) {
    const parsed: unknown = JSON.parse(text);
    return Array.isArray(parsed) ? parsed.filter(isNote) : [];
  }
  const scratch = await readIfThere(fileSystem, joinPath(dir, OLD_SCRATCH));
  return scratch?.trim() ? [{ ...newStickyNote({ left: 24, top: 24 }), text: scratch }] : [];
}

export const writeStickyNotes = (fileSystem: FileSystem, dir: string, notes: StickyNote[]) =>
  writeAtomic(fileSystem, joinPath(dir, NOTES_FILE), `${JSON.stringify(notes, null, 2)}\n`);
