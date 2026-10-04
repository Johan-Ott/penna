export interface PaletteEntry {
  id: string;
  label: string;
  group: "Scener" | "Kapitel" | "Karaktärer" | "Platser" | "Kommandon";
  shortcut?: string;
  /** Grey text on the right, such as the chapter a scene belongs to. */
  hint?: string;
  run: () => void;
}

// "ä" and "a" match each other when searching, so "fokuslage" finds "Fokusläge".
const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

function hasLettersInOrder(text: string, query: string): boolean {
  let position = 0;
  for (const letter of query) {
    position = text.indexOf(letter, position) + 1;
    if (position === 0) return false;
  }
  return true;
}

/** Higher is better; zero means no match. */
function score(label: string, query: string): number {
  const text = fold(label);
  if (text.startsWith(query)) return 4;
  if (text.split(/\s+/).some((word) => word.startsWith(query))) return 3;
  if (text.includes(query)) return 2;
  // Letters spread out over a label match almost anything when only one or two are typed.
  return query.length >= 3 && hasLettersInOrder(text, query) ? 1 : 0;
}

/** Entries that match the query, best first; everything, in order, when the query is empty. */
export function searchPalette(entries: PaletteEntry[], query: string): PaletteEntry[] {
  const folded = fold(query.trim());
  if (folded === "") return entries;
  return entries
    .map((entry, index) => ({ entry, index, points: score(entry.label, folded) }))
    .filter((match) => match.points > 0)
    .sort((first, second) => second.points - first.points || first.index - second.index)
    .map((match) => match.entry);
}

// The order follows the type above, so a new kind of entry cannot be left out of the list.
const GROUP_ORDER: Record<PaletteEntry["group"], number> = {
  Scener: 0,
  Kapitel: 1,
  Karaktärer: 2,
  Platser: 3,
  Kommandon: 4,
};

/** Results in groups, as in the design; the best match comes first within a group. */
export const inGroups = (found: PaletteEntry[]) =>
  [...found].sort((first, second) => GROUP_ORDER[first.group] - GROUP_ORDER[second.group]);
