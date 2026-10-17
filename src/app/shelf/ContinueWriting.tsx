import type { ShelfBook } from "../../project/shelf.js";
import { amountOf, deadlineLine } from "../../project/shelfLines.js";
import { placeIn } from "../resume/lastPlace.js";
import { BookCover } from "./Book.js";
import { t } from "../../i18n/i18n.js";

// The writer's way back in, first on the shelf: the book written in last, the words they left
// it at, and one button. The book opens where they stopped.

const QUOTE_WORDS = 12;

// The last words before the cursor, cut at a word so the line starts clean.
function lastWords(dir: string) {
  const before = placeIn(dir)?.before.trim();
  if (!before) return null;
  return `…${before.split(/\s+/).slice(-QUOTE_WORDS).join(" ")}`;
}

export function ContinueWriting(props: {
  books: ShelfBook[];
  author: string;
  onOpen: (dir: string) => void;
}) {
  const [latest] = props.books
    .filter((book) => !book.isMissing && book.updatedAt !== null)
    .sort((one, other) => (other.updatedAt ?? 0) - (one.updatedAt ?? 0));
  if (!latest) return null;
  const quote = lastWords(latest.dir);
  const today = new Date().toISOString().slice(0, 10);
  const line = [amountOf(latest), deadlineLine(latest, today)].filter(Boolean).join(" · ");
  return (
    <section className="continue-writing" aria-label={t("Fortsätt skriva")}>
      <BookCover book={latest} author={props.author} onOpen={props.onOpen} />
      <div className="continue-text">
        <span className="continue-eyebrow">{t("Fortsätt skriva")}</span>
        <h2>{latest.title}</h2>
        {quote && <p className="continue-quote">{quote}</p>}
        <span className="book-updated">{line}</span>
        <button className="button primary" onClick={() => props.onOpen(latest.dir)}>
          {t("Fortsätt där du slutade")}
        </button>
      </div>
    </section>
  );
}
