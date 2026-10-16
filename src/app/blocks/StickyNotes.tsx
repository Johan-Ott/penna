import { useEffect, useRef, useState } from "react";
import { placeInRoom, rubOut } from "../../project/stickyNoteGeometry.js";
import { NOTE_COLORS, type StickyNote } from "../../project/stickyNotes.js";
import { CloseIcon, GripIcon, PenIcon, PlusIcon } from "../shell/icons.js";
import { EraserIcon } from "./EraserIcon.js";
import { NoteDrawing, type NoteTool } from "./NoteDrawing.js";
import { useKeptSize, useNoteDrag, useRoomSize } from "./stickyNoteHooks.js";
import type { StickyNotesState } from "./useStickyNotes.js";
import { t } from "../../i18n/i18n.js";

// Lappar over the text, each with text, pen and eraser, kept inside the window while keeping
// its own place for when the window grows. Removing one with something on it asks first.

type Props = { note: StickyNote; state: StickyNotesState };

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
      {isAsking ? t("Ta bort?") : <CloseIcon />}
    </button>
  );
}

type Box = { left: number; top: number; width: number; height: number };

function ToolButton(props: {
  tool: NoteTool;
  chosen: NoteTool | null;
  onChoose: (tool: NoteTool | null) => void;
}) {
  const isChosen = props.chosen === props.tool;
  return (
    <button
      className={isChosen ? "note-tool chosen" : "note-tool"}
      aria-label={props.tool === "pen" ? t("Rita") : t("Sudda")}
      aria-pressed={isChosen}
      onClick={() => props.onChoose(isChosen ? null : props.tool)}
    >
      {props.tool === "pen" ? <PenIcon /> : <EraserIcon />}
    </button>
  );
}

function NoteHead(
  props: Props & { shown: Box; tool: NoteTool | null; onTool: (tool: NoteTool | null) => void },
) {
  const { note, state } = props;
  const addNext = () =>
    state.add({ left: props.shown.left + 24, top: props.shown.top + 24 }, note.color);
  const drag = useNoteDrag(note, props.shown, state);
  return (
    <header className="note-head" onPointerDown={drag}>
      <GripIcon />
      <ColorDots note={note} state={state} />
      <ToolButton tool="pen" chosen={props.tool} onChoose={props.onTool} />
      <ToolButton tool="eraser" chosen={props.tool} onChoose={props.onTool} />
      <button className="note-tool" aria-label={t("Ny lapp")} onClick={addNext}>
        <PlusIcon />
      </button>
      <RemoveButton note={note} state={state} />
    </header>
  );
}

function NoteBody(props: Props & { shown: Box; tool: NoteTool | null }) {
  const { note, state } = props;
  const erase = (point: [number, number]) =>
    state.change(note.id, { strokes: rubOut(note.strokes, point) });
  return (
    <div className="note-body">
      <textarea
        value={note.text}
        aria-label={t("Lappens text")}
        placeholder={t("Skriv eller rita…")}
        onChange={(event) => state.change(note.id, { text: event.target.value })}
      />
      <NoteDrawing
        strokes={note.strokes}
        tool={props.tool}
        size={`${props.shown.width}x${props.shown.height}`}
        onStroke={(stroke) => state.change(note.id, { strokes: [...note.strokes, stroke] })}
        onErase={erase}
      />
    </div>
  );
}

function StickyNoteCard({ note, state }: Props) {
  const card = useRef<HTMLElement>(null);
  const [tool, setTool] = useState<NoteTool | null>(null);
  const shown = placeInRoom(note, useRoomSize(card));
  useKeptSize(card, note, shown, state);
  return (
    <section
      ref={card}
      className={`sticky-note ${note.color}`}
      style={shown}
      aria-label={t("Lapp")}
    >
      <NoteHead {...{ note, state, shown, tool }} onTool={setTool} />
      <NoteBody note={note} state={state} shown={shown} tool={tool} />
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
