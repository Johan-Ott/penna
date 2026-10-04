import { useEffect, useRef } from "react";
import { connectionsOf } from "../../project/connections.js";
import type { Project } from "../useProject.js";
import type { Notes } from "./useNotes.js";
import { t } from "../../i18n/i18n.js";

const CARD_WIDTH = 310;
const EDGE = 16;

// Below the name, kept inside the window.
function placeOf(box: DOMRect) {
  const left = Math.min(Math.max(EDGE, box.left - 24), window.innerWidth - CARD_WIDTH - EDGE);
  return { top: box.bottom + 8, left };
}

// The card goes away on Escape, on a click outside it, or as soon as the writer types on.
function useCloseOnOutside(onClose: () => void) {
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      if (!cardRef.current?.contains(event.target as Node)) onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (!cardRef.current?.contains(event.target as Node)) onClose();
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("pointerdown", onPointer, true);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("pointerdown", onPointer, true);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [onClose]);
  return cardRef;
}

/** "Elin, brorsdotter · Henrik, bror": the note's connections, named by the other notes' titles. */
function connectionLine(project: Project, noteId: string) {
  return connectionsOf(project.fields, noteId)
    .flatMap((connection) => {
      const name = project.summaries[connection.id]?.title;
      if (!name) return [];
      return [connection.role ? `${name}, ${connection.role}` : name];
    })
    .join(" · ");
}

/** The card shown when a name in the text is clicked: who it is, who they are to others. */
export function MentionCard(props: {
  notes: Notes;
  /** The series and the book: a note's connections are kept where the note lives. */
  homes: Project[];
  onOpenNote: (id: string) => void;
}) {
  const { notes, homes } = props;
  const cardRef = useCloseOnOutside(notes.hideMention);
  const shown = notes.mention;
  const card = notes.cards.find((candidate) => candidate.id === shown?.id);
  if (!shown || !card) return null;
  const description = notes.descriptionOf(card.id);
  const home = homes.find((candidate) => candidate.summaries[card.id]);
  const connections = home ? connectionLine(home, card.id) : "";
  const place = placeOf(shown.box);
  return (
    <div ref={cardRef} className="mention-card" role="dialog" aria-label={card.name} style={place}>
      <div className="mention-head">
        <span className="mention-name">{card.name}</span>
        {description && <span className="mention-description">{description}</span>}
      </div>
      {connections && <span className="mention-connections">{connections}</span>}
      <button className="link-button" onClick={() => props.onOpenNote(card.id)}>
        {t("Öppna anteckningen")}
      </button>
    </div>
  );
}
