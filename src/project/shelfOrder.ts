import type { ShelfBook } from "./shelf.js";
import { numberLocale } from "../i18n/i18n.js";

/** How the books on their own stand: the last written in first, by title, or the longest first. */
export type ShelfSort = "senast" | "titel" | "ord";

export interface ShelfOrder {
  sort: ShelfSort;
  /** The favourite books, by folder. */
  favorites: readonly string[];
}

export const START_ORDER: ShelfOrder = { sort: "senast", favorites: [] };

const COMPARE: Record<ShelfSort, (one: ShelfBook, other: ShelfBook) => number> = {
  senast: (one, other) => (other.updatedAt ?? -1) - (one.updatedAt ?? -1),
  titel: (one, other) => one.title.localeCompare(other.title, numberLocale()),
  ord: (one, other) => other.words - one.words,
};

// Numbered books first, by number; the rest after them as they were.
const inSeriesOrder = (books: ShelfBook[]) =>
  [...books].sort(
    (one, other) =>
      (one.seriesNumber ?? Number.MAX_SAFE_INTEGER) -
      (other.seriesNumber ?? Number.MAX_SAFE_INTEGER),
  );

// The favourites first, then the chosen order; a missing book last whatever it is.
function onTheirOwn(books: ShelfBook[], { sort, favorites }: ShelfOrder) {
  const rank = (book: ShelfBook) => {
    if (book.isMissing) return 2;
    return favorites.includes(book.dir) ? 0 : 1;
  };
  return [...books].sort((one, other) => rank(one) - rank(other) || COMPARE[sort](one, other));
}

/** The books on their own first, then each series under its name in the series' own order. */
export function shelfGroups(books: ShelfBook[], order: ShelfOrder = START_ORDER) {
  const names = [...new Set(books.map((book) => book.series))];
  const ordered = [null, ...names.filter((name) => name !== null)];
  return ordered
    .map((series) => {
      const inGroup = books.filter((book) => book.series === series);
      return { series, books: series ? inSeriesOrder(inGroup) : onTheirOwn(inGroup, order) };
    })
    .filter((group) => group.books.length > 0);
}
