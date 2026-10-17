import { daysBetween, deadlinePlan } from "./progress.js";
import { isDraftStage, type ShelfBook } from "./shelf.js";
import { formatNumber, t } from "../i18n/i18n.js";

// What a book's card on the shelf says about where it stands.

// A book cached on the shelf before goals were read has none.
export const isDrafting = (book: ShelfBook) =>
  typeof book.goal === "number" && isDraftStage(book.stage);

/** "8 veckor kvar · 1 400 ord/dag", or null when the book has no deadline. */
export function deadlineLine(book: ShelfBook, today: string) {
  if (!book.deadline) return null;
  const days = daysBetween(today, book.deadline);
  if (days < 0) return t("Deadline passerad");
  const left =
    days < 14
      ? t("{days} dagar kvar", { days })
      : t("{weeks} veckor kvar", { weeks: Math.floor(days / 7) });
  const plan = isDrafting(book)
    ? deadlinePlan(
        { words: book.words, goal: book.goal ?? null, deadline: book.deadline },
        today,
        0,
      )
    : null;
  return plan && plan.wordsPerDay > 0
    ? `${left} · ${t("{count} ord/dag", { count: formatNumber(plan.wordsPerDay) })}`
    : left;
}

/** While drafting, the words toward the goal; in revision, how much is finished; else the words. */
export function amountOf(book: ShelfBook) {
  if (isDrafting(book))
    return t("{words} av {goal} ord", {
      words: formatNumber(book.words),
      goal: formatNumber(book.goal ?? 0),
    });
  if (isDraftStage(book.stage)) return t("{count} ord", { count: formatNumber(book.words) });
  return t("{progress}% klart", { progress: book.progress });
}
