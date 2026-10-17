import type { PointerEvent } from "react";
import { GuideTip } from "../guide/GuideTip.js";
import { useFloating } from "../blocks/BlockPanel.js";
import { usePhone } from "../phone/usePhone.js";
import { GripIcon } from "../shell/icons.js";
import { CloseButton } from "../controls.js";
import { useEffect, type ReactNode } from "react";
import type { NameSuspect } from "../../manuscript/review.js";
import type { ProseNote } from "../../manuscript/prose.js";
import type { Card } from "../../project/cards.js";
import type { useReview } from "./useReview.js";
import { t } from "../../i18n/i18n.js";

interface ReviewPanelProps {
  /** Null when Granskning is off and only comments are shown. */
  review: ReturnType<typeof useReview> | null;
  commentsSection: ReactNode;
  narrationSection: ReactNode;
  /** About the whole book rather than the scene, such as people who fade out of it. */
  bookNotes: ProseNote[];
  revisionSection: ReactNode;
  revisionCount: number;
  repeatWindow: number;
  onOpenCard: (id: string) => void;
  onReplaceAll: (suspect: NameSuspect) => void;
  onIgnore: (word: string) => void;
  /** Kept open while a comment is being written. */
  isPinnedOpen: boolean;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  /** Null when the panel goes away, so the top bar hides its count. */
  onCount: (count: number | null) => void;
  commentCount: number;
}

const NUMBER_WORDS = [t("noll"), t("en"), t("två"), t("tre"), t("fyra"), t("fem"), t("sex")];
const inWords = (count: number) => NUMBER_WORDS[count] ?? String(count);
const times = (count: number) =>
  count === 1 ? t("en gång") : t("{count} gånger", { count: inWords(count) });

function InChapter({ cards, onOpenCard }: { cards: Card[]; onOpenCard: (id: string) => void }) {
  if (cards.length === 0) return null;
  return (
    <section className="review-section">
      <span className="review-heading">{t("I kapitlet")}</span>
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
      <span className="review-title">{t("Namnstavning")}</span>
      <span className="review-text">
        {t("”{word}” står {times} i scenen. Menade du {suggestion}?", {
          word: suspect.word,
          times: times(suspect.count),
          suggestion: suspect.suggestion,
        })}
      </span>
      <div className="review-actions">
        <button className="button primary small" onClick={() => props.onReplaceAll(suspect)}>
          {t("Ändra alla")}
        </button>
        <button className="button secondary small" onClick={() => props.onIgnore(suspect.word)}>
          {t("Ignorera")}
        </button>
      </div>
    </div>
  );
}

const ProseItems = ({ notes }: { notes: ProseNote[] }) =>
  notes.map((note) => (
    <div key={`${note.kind}${note.text}`} className="review-item">
      <span className="review-title">{note.title}</span>
      <span className="review-text">{note.text}</span>
    </div>
  ));

function ToLookAt(props: ReviewPanelProps & { review: ReturnType<typeof useReview> }) {
  const { suspects, repeats, prose } = props.review;
  if (suspects.length + repeats.length + prose.length === 0) {
    return <p className="review-empty">{t("Inget att se över i den här scenen.")}</p>;
  }
  return (
    <section className="review-section">
      <span className="review-heading">{t("Att se över")}</span>
      {suspects.map((suspect) => (
        <SpellingItem key={suspect.word} suspect={suspect} {...props} />
      ))}
      {repeats.map((repeat) => (
        <div key={repeat.word} className="review-item">
          <span className="review-title">{t("Upprepning")}</span>
          <span className="review-text">
            {t("”{word}” {times} inom {window} meningar.", {
              word: repeat.word,
              times: times(repeat.count),
              window: inWords(props.repeatWindow),
            })}
          </span>
        </div>
      ))}
      <ProseItems notes={prose} />
    </section>
  );
}

function InBook({ notes }: { notes: ProseNote[] }) {
  if (notes.length === 0) return null;
  return (
    <section className="review-section">
      <span className="review-heading">{t("I boken")}</span>
      <ProseItems notes={notes} />
    </section>
  );
}

function ReviewHeader(props: {
  isShown: boolean;
  onClose: () => void;
  onGrab: ((event: PointerEvent<HTMLElement>) => void) | undefined;
}) {
  return (
    <div className="review-header block-head" onPointerDown={props.onGrab}>
      <span className="progress-title block-title">
        <GripIcon />
        {t("Granska")}
      </span>
      <CloseButton
        label={t("Stäng granskning")}
        isPhoneBack={props.isShown}
        onClose={props.onClose}
      />
    </div>
  );
}

function useCountInTopbar(count: number, onCount: (count: number | null) => void) {
  useEffect(() => onCount(count), [count, onCount]);
  useEffect(() => () => onCount(null), [onCount]);
}

export function ReviewPanel(props: ReviewPanelProps) {
  const { review } = props;
  const found = review ? review.suspects.length + review.repeats.length + review.prose.length : 0;
  const count = found + props.commentCount + props.revisionCount;
  useCountInTopbar(count, props.onCount);
  const isShown = props.isOpen || props.isPinnedOpen;
  const floating = useFloating("granska", !usePhone());
  return (
    <aside
      ref={floating.ref}
      className={isShown ? "review-panel open" : "review-panel"}
      aria-label={t("Granskning")}
      style={floating.style}
    >
      <ReviewHeader
        isShown={isShown}
        onClose={() => props.onOpenChange(false)}
        onGrab={floating.onPointerDown}
      />
      {props.revisionSection}
      {review && props.narrationSection}
      {review && <InChapter cards={review.inChapter} onOpenCard={props.onOpenCard} />}
      {review && <ToLookAt {...props} review={review} />}
      {review && <InBook notes={props.bookNotes} />}
      {props.commentsSection}
      <GuideTip step="granska" isHere={isShown} />
    </aside>
  );
}
