import { folderTitle } from "./shelf.js";

// A book without a picture gets a cover in its genre's colours, as a shop would show it. A book
// without a genre gets one of the plain looks, from its folder's name, so it keeps it when moved.

const GENRE_LOOKS = [
  "deckare",
  "thriller",
  "skrack",
  "romans",
  "magi",
  "urban",
  "scifi",
  "historisk",
  "feelgood",
  "ungdom",
  "litterar",
  "barnbok",
];

export const COVER_LOOKS = [
  "cover-skog",
  "cover-ockra",
  "cover-oxblod",
  "cover-skiffer",
  "cover-plommon",
];

export function coverLookOf(dir: string, genre: string | null = null): string {
  if (genre && GENRE_LOOKS.includes(genre)) return `cover-${genre}`;
  const name = folderTitle(dir);
  let hash = 0;
  for (const character of name) hash = (hash * 31 + (character.codePointAt(0) ?? 0)) >>> 0;
  return COVER_LOOKS[hash % COVER_LOOKS.length] ?? "cover-skog";
}
