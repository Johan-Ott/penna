import { useEffect, useRef } from "react";
import type { Card, Mentions } from "../../project/cards.js";
import type { Project } from "../useProject.js";
import { initials, mentionCount, mentionedChapters } from "./cardFormat.js";
import type { usePlanning } from "./usePlanning.js";

type Planning = ReturnType<typeof usePlanning>;

const CARD_WIDTH = 300;
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

// "188 omnämnanden · senast kap. 5"
function whereMentioned(project: Project, mentions: Mentions | undefined) {
  const last = Math.max(0, ...mentionedChapters(project, mentions));
  const count = mentionCount(mentions?.count ?? 0);
  return last > 0 ? `${count} · senast kap. ${last}` : count;
}

function CardHead({ card }: { card: Card }) {
  return (
    <div className="entity-head">
      <span className="entity-avatar small">{initials(card.name)}</span>
      <span className="entity-name">{card.name}</span>
    </div>
  );
}

/** The card shown when a name in the text is clicked: who, how its text begins, where named. */
export function MentionCard(props: {
  planning: Planning;
  project: Project;
  onOpenCard: (id: string) => void;
}) {
  const { planning, project } = props;
  const cardRef = useCloseOnOutside(planning.hideMention);
  const shown = planning.mention;
  const card = planning.cards.find((candidate) => candidate.id === shown?.id);
  if (!shown || !card) return null;
  const excerpt = planning.excerptOf(card.id);
  return (
    <div
      ref={cardRef}
      className="mention-card"
      role="dialog"
      aria-label={card.name}
      style={placeOf(shown.box)}
    >
      <CardHead card={card} />
      {excerpt && <p className="mention-excerpt">{excerpt}</p>}
      <div className="mention-foot">
        <span>{whereMentioned(project, planning.mentions.get(card.id))}</span>
        <button className="link-button" onClick={() => props.onOpenCard(card.id)}>
          Öppna
        </button>
      </div>
    </div>
  );
}
