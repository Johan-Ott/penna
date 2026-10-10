import { numberLocale, t } from "../i18n/i18n.js";
import type { ProseNote } from "./prose.js";

// The book's way of telling, chosen when it is made or in Granska, and what Granska then watches
// for in the narration: the text outside the lines spoken.

export type Voice = "jag" | "nara" | "tredje" | "allvetande";
export type Tense = "dåtid" | "nutid";
export interface Narration {
  voice: Voice;
  tense: Tense;
}

export const VOICES: [Voice, string][] = [
  ["jag", t("Jag-form")],
  ["nara", t("Tredje person nära (deep POV)")],
  ["tredje", t("Tredje person")],
  ["allvetande", t("Allvetande")],
];
export const TENSES: [Tense, string][] = [
  ["dåtid", t("Dåtid")],
  ["nutid", t("Nutid")],
];

/** Null until the writer has chosen. */
export function narrationOf(fields: Record<string, unknown>): Narration | null {
  const value = fields["narration"] as Partial<Narration> | undefined;
  const voice = VOICES.find(([id]) => id === value?.voice)?.[0];
  const tense = TENSES.find(([id]) => id === value?.tense)?.[0];
  return voice && tense ? { voice, tense } : null;
}

interface Words {
  firstPerson: string[];
  /** Seeing, hearing and feeling told instead of shown, which deep POV leaves out. */
  filters: RegExp;
  /** A mind's verbs, for whose head the narration is in. */
  minds: string;
  present: string[];
  past: string[];
}

const WORDS: Record<string, Words> = {
  "sv-SE": {
    firstPerson: ["jag", "mig", "min", "mitt", "mina"],
    filters:
      /(?<!\p{L})(?:(?:jag|hon|han|hen)\s+(?:såg|hörde|kände|tänkte|undrade|insåg|märkte|förstod)(?:\s+att)?|verkade|kändes som)(?!\p{L})/giu,
    minds: "tänkte|kände|undrade|insåg|visste|mindes|önskade|fruktade|hoppades",
    present: ["är", "har", "går", "ser", "kommer", "säger", "tar", "står", "sitter", "vet", "blir"],
    past: ["var", "hade", "gick", "såg", "kom", "sa", "tog", "stod", "satt", "visste", "blev"],
  },
  "en-GB": {
    firstPerson: ["i", "me", "my", "mine"],
    filters:
      /(?<!\p{L})(?:(?:i|she|he|they)\s+(?:saw|heard|felt|thought|wondered|realized|noticed|knew)(?:\s+that)?|seemed)(?!\p{L})/giu,
    minds: "thought|felt|wondered|realized|knew|remembered|wished|feared|hoped",
    present: ["is", "has", "goes", "sees", "comes", "says", "takes", "stands", "knows"],
    past: ["was", "had", "went", "saw", "came", "said", "took", "stood", "knew"],
  },
};

// Lines that open with a dash are speech, and so is what stands in quotation marks.
export function narrationText(text: string) {
  return text
    .split("\n")
    .filter((line) => !/^\s*[\u2013\u2014-]/.test(line))
    .join("\n")
    .replace(/[”"“«»][^”"“«»]*[”"“«»]/g, " ");
}

const wordsOf = (text: string) => text.toLocaleLowerCase(numberLocale()).match(/[\p{L}]+/gu) ?? [];

function countOf(all: string[], words: string[]) {
  return words
    .map((word) => [word, all.filter((each) => each === word).length] as const)
    .filter(([, count]) => count > 0);
}

const listed = (found: (readonly [string, number])[]) =>
  found.map(([word, count]) => `”${word}” ${count}`).join(", ");

function voiceNote(all: string[], words: Words, narration: Narration): ProseNote[] {
  if (narration.voice === "jag") return [];
  const found = countOf(all, words.firstPerson);
  if (found.length === 0) return [];
  const text = t("{words} utanför replikerna, men boken berättas i tredje person.", {
    words: listed(found),
  });
  return [{ kind: "voice", title: t("Jag i berättartexten"), text }];
}

function filterNote(narration: string, words: Words, voice: Voice): ProseNote[] {
  if (voice !== "nara" && voice !== "jag") return [];
  const found = [...new Set(narration.match(words.filters) ?? [])];
  if (found.length === 0) return [];
  const text = t("{words}. Nära perspektiv visar det direkt i stället.", {
    words: found.map((each) => `”${each.toLocaleLowerCase(numberLocale())}”`).join(", "),
  });
  return [{ kind: "filter", title: t("Filterord"), text }];
}

const escaped = (name: string) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Someone else's thoughts, in a chapter told through one person's eyes.
function headNote(narration: string, words: Words, others: string[], voice: Voice): ProseNote[] {
  if (voice === "allvetande" || others.length === 0) return [];
  const heads = others.filter((name) =>
    new RegExp(`(?<!\\p{L})${escaped(name)}\\s+(?:${words.minds})(?!\\p{L})`, "iu").test(narration),
  );
  if (heads.length === 0) return [];
  const text = t("{names} tänker eller känner här, fast kapitlet ses genom någon annans ögon.", {
    names: heads.join(", "),
  });
  return [{ kind: "head", title: t("Huvudhopp"), text }];
}

const TENSE_TIMES = 3;

function tenseNote(all: string[], words: Words, tense: Tense): ProseNote[] {
  const wrong = countOf(all, tense === "dåtid" ? words.present : words.past);
  if (wrong.reduce((sum, [, count]) => sum + count, 0) < TENSE_TIMES) return [];
  const text = t("{words} i berättartexten, men boken skrivs i {tense}.", {
    words: listed(wrong),
    tense: tense === "dåtid" ? t("dåtid") : t("nutid"),
  });
  return [{ kind: "tense", title: t("Tempus"), text }];
}

/** What breaks the chosen way of telling; `others` are the people whose eyes the chapter is not in. */
export function narrationNotes(
  text: string,
  language: string,
  narration: Narration | null,
  others: string[],
): ProseNote[] {
  const words = WORDS[language];
  if (!words || !narration) return [];
  const told = narrationText(text);
  const all = wordsOf(told);
  return [
    ...voiceNote(all, words, narration),
    ...filterNote(told, words, narration.voice),
    ...headNote(told, words, others, narration.voice),
    ...tenseNote(all, words, narration.tense),
  ];
}
