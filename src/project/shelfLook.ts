import { folderTitle } from "./shelf.js";

/** The plain covers a book without a picture gets on the shelf, grey like the rest of Penna. */
export const COVER_LOOKS = ["cover-black", "cover-light", "cover-dark", "cover-white"];

// From the folder's name, so a book keeps its look when others are added or the library moves.
export function coverLookOf(dir: string): string {
  const name = folderTitle(dir);
  let hash = 0;
  for (const character of name) hash = (hash * 31 + (character.codePointAt(0) ?? 0)) >>> 0;
  return COVER_LOOKS[hash % COVER_LOOKS.length] ?? "cover-black";
}
