import { useEffect, useRef, useState, type PointerEvent } from "react";
import { NOTE_COLORS, type StickyNote } from "../../project/stickyNotes.js";
import { GripIcon, PenIcon } from "../shell/icons.js";
import { NoteDrawing } from "./NoteDrawing.js";
import type { StickyNotesState } from "./useStickyNotes.js";
import { t } from "../../i18n/i18n.js";

// Lappar over the text: each moved by its head, sized from its corner, in its own colour, with
// text to write and the pen to draw. Removing one with something on it asks first.

type Props = { note: StickyNote; state: StickyNotesState };

function useNoteDrag({ note, state }: Props) {
  return (event: PointerEvent<HTMLElement>) => {
    const card = event.currentTarget.parentElement;
    if (!card || (event.target as HTMLElement).closest("button")) return;
    event.preventDefault();
    const room = card.offsetParent?.getBoundingClientRect();
    const grab = { x: event.clientX - note.left, y: event.clientY - note.top };
    const move = (moved: globalThis.PointerEvent) => {
      const left = Math.max(
        0,
        Math.min(moved.clientX - grab.x, (room?.width ?? 2000) - card.offsetWidth),
      );
      const top = Math.max(
        0,
        Math.min(moved.clientY - grab.y, (room?.height ?? 2000) - card.offsetHeight),
      );
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

// The size the writer drags the corner to is kept with the note.
function useKeptSize(card: React.RefObject<HTMLElement | null>, { note, state }: Props) {
  useEffect(() => {
    const element = card.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      const width = element.offsetWidth;
      const height = element.offsetHeight;
      if (width !== note.width || height !== note.height) state.change(note.id, { width, height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  });
}

const COLOR_NAMES: Record<StickyNote["color"], string> = {
  gul: t("Gul"),
  rosa: t("Rosa"),
  mint: t("Mint"),
  himmel: t("Himmelsblå"),
  lavendel: t("Lavendel"),
};

function ColorDots({ note, state }: Props) {
  return (
    <>
      {NOTE_COLORS.map((color) => (
        <button
          key={color}
          className={`note-color ${color}`}
          aria-label={COLOR_NAMES[color]}
          aria-pressed={note.color === color}
          onClick={() => state.change(note.id, { color })}
        />
      ))}
    </>
  );
}

// A note with nothing on it goes at once; one with text or a drawing asks first.
function RemoveButton({ note, state }: Props) {
  const [isAsking, setAsking] = useState(false);
  const hasContent = note.text.trim() !== "" || note.strokes.length > 0;
  const remove = () => (hasContent && !isAsking ? setAsking(true) : state.remove(note.id));
  return (
    <button
      className={isAsking ? "note-tool asking" : "note-tool"}
      aria-label={t("Ta bort lappen")}
      onClick={remove}
      onMouseLeave={() => setAsking(false)}
    >
      {isAsking ? t("Ta bort?") : "×"}
    </button>
  );
}

function NoteHead(props: Props & { isPen: boolean; onPen: () => void }) {
  const { note, state } = props;
  const addNext = () => state.add({ left: note.left + 24, top: note.top + 24 }, note.color);
  return (
    <header className="note-head" onPointerDown={useNoteDrag(props)}>
      <GripIcon />
      <ColorDots note={note} state={state} />
      <button
        className={props.isPen ? "note-tool chosen" : "note-tool"}
        aria-label={t("Rita")}
        aria-pressed={props.isPen}
        onClick={props.onPen}
      >
        <PenIcon />
      </button>
      <button className="note-tool" aria-label={t("Ny lapp")} onClick={addNext}>
        +
      </button>
      <RemoveButton note={note} state={state} />
    </header>
  );
}

export function StickyNoteCard({ note, state }: Props) {
  const card = useRef<HTMLElement>(null);
  const [isPen, setPen] = useState(false);
  useKeptSize(card, { note, state });
  const style = { left: note.left, top: note.top, width: note.width, height: note.height };
  return (
    <section
      ref={card}
      className={`sticky-note ${note.color}`}
      style={style}
      aria-label={t("Lapp")}
    >
      <NoteHead note={note} state={state} isPen={isPen} onPen={() => setPen(!isPen)} />
      <div className="note-body">
        <textarea
          value={note.text}
          aria-label={t("Lappens text")}
          placeholder={t("Skriv eller rita…")}
          onChange={(event) => state.change(note.id, { text: event.target.value })}
        />
        <NoteDrawing
          strokes={note.strokes}
          isPen={isPen}
          size={`${note.width}x${note.height}`}
          onStroke={(stroke) => state.change(note.id, { strokes: [...note.strokes, stroke] })}
        />
      </div>
    </section>
  );
}

/** The book's notes over the text; opened with none, it starts the first. */
export function StickyNotesLayer({ state }: { state: StickyNotesState }) {
  const { notes } = state;
  const hasStarted = useRef(false);
  useEffect(() => {
    if (notes === null || hasStarted.current) return;
    hasStarted.current = true;
    // The first at the top right, clear of the tree and of where the text begins.
    if (notes.length === 0) state.add({ left: Math.max(24, window.innerWidth - 260), top: 64 });
  }, [notes, state]);
  return (
    <>
      {(notes ?? []).map((note) => (
        <StickyNoteCard key={note.id} note={note} state={state} />
      ))}
    </>
  );
}
