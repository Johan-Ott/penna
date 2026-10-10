import { numberLocale, t } from "../i18n/i18n.js";
import type { ProseNote } from "../manuscript/prose.js";
import type { Card } from "./cards.js";
import { CHARACTERS_ID } from "./tree.js";

// About the whole book: the gestures that come back too often, and names easy to mix up.

const GESTURES: Record<string, string[]> = {
  "sv-SE": [
    "log",
    "nickade",
    "suckade",
    "ryckte på axlarna",
    "himlade med ögonen",
    "bet sig i läppen",
    "svalde",
    "flinade",
    "rynkade pannan",
    "höjde på ögonbrynen",
  ],
  "en-GB": [
    "smiled",
    "nodded",
    "sighed",
    "shrugged",
    "rolled her eyes",
    "rolled his eyes",
    "bit her lip",
    "swallowed",
    "grinned",
    "frowned",
  ],
};

const MIN_TIMES = 10;
// Times per ten thousand words, about one in every few pages.
const PER_TEN_THOUSAND = 12;

const timesIn = (lower: string, phrase: string) =>
  lower.match(new RegExp(`(?<!\\p{L})${phrase}(?!\\p{L})`, "gu"))?.length ?? 0;

/** The gestures the writer reaches for most, counted across the book. */
export function gestureNotes(texts: string[], language: string): ProseNote[] {
  const lower = texts.join("\n").toLocaleLowerCase(numberLocale());
  const words = lower.split(/\s+/).filter(Boolean).length;
  const often = (GESTURES[language] ?? [])
    .map((phrase) => [phrase, timesIn(lower, phrase)] as const)
    .filter(([, count]) => count >= MIN_TIMES && (count * 10_000) / words >= PER_TEN_THOUSAND);
  if (often.length === 0) return [];
  const text = t("{gestures} i boken. Byt några mot vad personen gör just då.", {
    gestures: often.map(([phrase, count]) => `”${phrase}” ${count}`).join(", "),
  });
  return [{ kind: "gesture", title: t("Gester som kommer ofta"), text }];
}

// Letters changed, added or taken away to turn one name into the other.
function distance(first: string, second: string) {
  let previous = Array.from({ length: second.length + 1 }, (_unused, index) => index);
  for (let row = 1; row <= first.length; row++) {
    const current = [row];
    for (let column = 1; column <= second.length; column++) {
      const change = first[row - 1] === second[column - 1] ? 0 : 1;
      current[column] = Math.min(
        (previous[column] ?? 0) + 1,
        (current[column - 1] ?? 0) + 1,
        (previous[column - 1] ?? 0) + change,
      );
    }
    previous = current;
  }
  return previous[second.length] ?? 0;
}

const isLookAlike = (first: string, second: string) =>
  first[0] === second[0] &&
  distance(first, second) <= (Math.min(first.length, second.length) > 3 ? 2 : 1);

/** People whose first names a reader can mix up, such as Elin and Ellen. */
export function similarNames(cards: Card[]): ProseNote[] {
  const names = cards
    .filter((card) => card.sortId === CHARACTERS_ID)
    .map((card) => card.name.split(/\s+/)[0] ?? "")
    .filter((name) => name.length >= 3);
  const pairs = names.flatMap((name, index) =>
    names
      .slice(index + 1)
      .filter((other) => isLookAlike(name.toLowerCase(), other.toLowerCase()))
      .map((other) => t("{first} och {second}", { first: name, second: other })),
  );
  if (pairs.length === 0) return [];
  const text = t("{pairs} liknar varandra och kan blandas ihop av läsaren.", {
    pairs: pairs.join(", "),
  });
  return [{ kind: "names", title: t("Namn som liknar varandra"), text }];
}
