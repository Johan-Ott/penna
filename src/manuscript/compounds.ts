import { numberLocale, t } from "../i18n/i18n.js";
import type { ProseNote } from "./prose.js";

// Särskrivning: two words that the dictionary knows as one, such as "sjuk sköterska". Shown as a
// question in Granska, never changed by itself, since some pairs are right both ways.

// Words that start a phrase rather than a compound: "som", "jag", "det" and their kind.
const NOT_FIRST = new Set([
  "och",
  "men",
  "att",
  "som",
  "han",
  "hon",
  "hen",
  "den",
  "det",
  "jag",
  "dig",
  "mig",
  "sig",
  "oss",
  "var",
  "har",
  "kan",
  "ska",
]);
const MOST_PAIRS = 400;

type Misspelled = (words: string[]) => Promise<string[]>;

const isCandidate = (first: string, second: string) =>
  first.length >= 3 &&
  second.length >= 3 &&
  !NOT_FIRST.has(first) &&
  /^\p{L}+$/u.test(first + second);

// Each pair of words side by side, keyed by how it would be written joined.
function pairsIn(text: string) {
  const words = text.toLocaleLowerCase(numberLocale()).match(/\p{L}+|[^\p{L}\s]+/gu) ?? [];
  const pairs = new Map<string, string>();
  for (let index = 0; index + 1 < words.length && pairs.size < MOST_PAIRS; index++) {
    const [first = "", second = ""] = [words[index], words[index + 1]];
    if (isCandidate(first, second)) pairs.set(first + second, `${first} ${second}`);
  }
  return pairs;
}

/** Pairs written apart whose joined word is a word, in the book's language; Swedish only. */
export async function splitCompounds(text: string, language: string, misspelled: Misspelled) {
  const pairs = language === "sv-SE" ? pairsIn(text) : new Map<string, string>();
  if (pairs.size === 0) return [];
  const wrong = new Set(await misspelled([...pairs.keys()]).catch((): string[] => []));
  const found = [...pairs].filter(([joined]) => !wrong.has(joined));
  if (found.length === 0) return [];
  const listed = found.map(([joined, apart]) => `”${apart}” → ”${joined}”`).join(", ");
  const note: ProseNote = {
    kind: "compound",
    title: t("Särskrivning?"),
    text: t("{pairs}. Skrivs ihop om det är ett ord.", { pairs: listed }),
  };
  return [note];
}
