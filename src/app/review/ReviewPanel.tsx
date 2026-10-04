import { useState, type ReactNode } from "react";
import type { NameSuspect } from "../../manuscript/review.js";
import type { Card } from "../../project/cards.js";
import type { useReview } from "./useReview.js";

interface ReviewPanelProps {
  /** Null when Granskning is off and only the comments are shown. */
  review: ReturnType<typeof useReview> | null;
  commentsSection: ReactNode;
  repeatWindow: number;
  onOpenCard: (id: string) => void;
  onReplaceAll: (suspect: NameSuspect) => void;
  onIgnore: (word: string) => void;
  /** Kept open in a narrow window, as while a comment is being written. */
  isPinnedOpen: boolean;
}

const NUMBER_WORDS = ["noll", "en", "två", "tre", "fyra", "fem", "sex"];
const inWords = (count: number) => NUMBER_WORDS[count] ?? String(count);
const times = (count: number) => (count === 1 ? "en gång" : `${inWords(count)} gånger`);

function InChapter({ cards, onOpenCard }: { cards: Card[]; onOpenCard: (id: string) => void }) {
  if (cards.length === 0) return null;
  return (
    <section className="review-section">
      <span className="review-heading">I kapitlet</span>
      <div className="review-chips">
        {cards.map((card) => (
          <button key={card.id} className="review-chip" onClick={() => onOpenCard(card.id)}>
            {card.name}
          </button>
        ))}
      </div>
    </section>
  );
}

function SpellingItem(
  props: { suspect: NameSuspect } & Pick<ReviewPanelProps, "onReplaceAll" | "onIgnore">,
) {
  const { suspect } = props;
  return (
    <div className="review-item">
      <span className="review-title">Namnstavning</span>
      <span className="review-text">
        ”{suspect.word}” står {times(suspect.count)} i scenen. Menade du {suspect.suggestion}?
      </span>
      <div className="review-actions">
        <button className="button primary small" onClick={() => props.onReplaceAll(suspect)}>
          Ändra alla
        </button>
        <button className="button secondary small" onClick={() => props.onIgnore(suspect.word)}>
          Ignorera
        </button>
      </div>
    </div>
  );
}

function ToLookAt(props: ReviewPanelProps & { review: ReturnType<typeof useReview> }) {
  const { suspects, repeats } = props.review;
  if (suspects.length + repeats.length === 0) {
    return <p className="review-empty">Inget att se över i den här scenen.</p>;
  }
  return (
    <section className="review-section">
      <span className="review-heading">Att se över</span>
      {suspects.map((suspect) => (
        <SpellingItem key={suspect.word} suspect={suspect} {...props} />
      ))}
      {repeats.map((repeat) => (
        <div key={repeat.word} className="review-item">
          <span className="review-title">Upprepning</span>
          <span className="review-text">
            ”{repeat.word}” {times(repeat.count)} inom {inWords(props.repeatWindow)} meningar.
          </span>
        </div>
      ))}
    </section>
  );
}

/** Granskning, as in the design: who is in the chapter, and what in the scene to look at again. */
function ReviewHeader(props: { review: ReviewPanelProps["review"]; onClose: () => void }) {
  const { review } = props;
  const count = review ? review.suspects.length + review.repeats.length : 0;
  return (
    <div className="review-header">
      <span className="progress-title">Granskning</span>
      {review && <span className="kpi-sub">{count === 1 ? "1 sak" : `${count} saker`}</span>}
      <button className="link-button quiet review-close" onClick={props.onClose}>
        Stäng
      </button>
    </div>
  );
}

// In a narrow window the panel covers the text, so it waits behind a tab until asked for.
export function ReviewPanel(props: ReviewPanelProps) {
  const { review } = props;
  const [isOpen, setOpen] = useState(false);
  const isShown = isOpen || props.isPinnedOpen;
  return (
    <>
      {!isShown && (
        <button className="button secondary small review-tab" onClick={() => setOpen(true)}>
          Granskning
        </button>
      )}
      <aside className={isShown ? "review-panel open" : "review-panel"} aria-label="Granskning">
        <ReviewHeader review={review} onClose={() => setOpen(false)} />
        {review && <InChapter cards={review.inChapter} onOpenCard={props.onOpenCard} />}
        {review && <ToLookAt {...props} review={review} />}
        {props.commentsSection}
      </aside>
    </>
  );
}
