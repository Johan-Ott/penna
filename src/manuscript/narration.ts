import { numberLocale, t } from "../i18n/i18n.js";
import type { ProseNote } from "./prose.js";

// The book's way of telling, chosen when it is made or in Granska, and what Granska then watches
// for in the narration: the text outside the lines spoken.

export type Voice = "jag" | "tredje" | "allvetande";
export type Tense = "dåtid" | "nutid";
export interface Narration {
  voice: Voice;
  tense: Tense;
  /** Inside the person's head, in first or third person: no filter words, feelings shown. */
  deep: boolean;
}

export const VOICES: [Voice, string][] = [
  ["jag", t("Jag-form")],
  ["tredje", t("Tredje person")],
  ["allvetande", t("Allvetande")],
];

/** The all-knowing narrator stands outside every head, so deep POV is for the other two. */
export const canBeDeep = (voice: Voice) => voice !== "allvetande";
export const TENSES: [Tense, string][] = [
  ["dåtid", t("Dåtid")],
  ["nutid", t("Nutid")],
];

type Stored = { voice?: string; tense?: string; deep?: unknown } | null | undefined;

// "nara" is how close third person was first stored, before deep POV had a switch of its own.
const voiceOf = (stored: Stored) =>
  VOICES.find(([id]) => id === (stored?.voice === "nara" ? "tredje" : stored?.voice))?.[0];
const wasDeep = (stored: Stored) => stored?.deep === true || stored?.voice === "nara";

/** Null until the writer has chosen. */
export function narrationOf(fields: Record<string, unknown>): Narration | null {
  const stored = fields["narration"] as Stored;
  const voice = voiceOf(stored);
  const tense = TENSES.find(([id]) => id === stored?.tense)?.[0];
  if (!voice || !tense) return null;
  return { voice, tense, deep: canBeDeep(voice) && wasDeep(stored) };
}

interface Words {
  firstPerson: string[];
  /** Seeing, hearing and feeling told instead of shown, which deep POV leaves out. */
  filters: RegExp;
  /** A feeling named instead of shown in the body or in what the person does. */
  feelings: RegExp;
  /** A mind's verbs, for whose head the narration is in. */
  minds: string;
  present: string[];
  past: string[];
}

const WORDS: Record<string, Words> = {
  "sv-SE": {
    firstPerson: ["jag", "mig", "min", "mitt", "mina"],
    filters:
      /(?<!\p{L})(?:(?:jag|hon|han|hen)\s+(?:såg|hörde|kände(?!\s+[sm]ig)|tänkte|undrade|insåg|märkte|förstod|kunde\s+(?:se|höra|känna))(?:\s+(?:att|hur))?|verkade|kändes som)(?!\p{L})/giu,
    feelings:
      /(?<!\p{L})(?:jag|hon|han|hen)\s+(?:var|blev|kände\s+[sm]ig)\s+(?:så\s+|väldigt\s+|helt\s+)?(?:arg|ledsen|rädd|glad|nervös|orolig|förvånad|besviken|irriterad|lycklig|svartsjuk|stolt|skamsen)(?!\p{L})/giu,
    minds: "tänkte|kände|undrade|insåg|visste|mindes|önskade|fruktade|hoppades",
    present: ["är", "har", "går", "ser", "kommer", "säger", "tar", "står", "sitter", "vet", "blir"],
    past: ["var", "hade", "gick", "såg", "kom", "sa", "tog", "stod", "satt", "visste", "blev"],
  },
  "en-GB": {
    firstPerson: ["i", "me", "my", "mine"],
    filters:
      /(?<!\p{L})(?:(?:i|she|he|they)\s+(?:saw|heard|felt|thought|wondered|realized|noticed|knew)(?:\s+that)?|seemed)(?!\p{L})/giu,
    feelings:
      /(?<!\p{L})(?:i|she|he|they)\s+(?:was|were|became|got)\s+(?:so\s+|very\s+)?(?:angry|sad|afraid|scared|happy|nervous|worried|surprised|disappointed|annoyed|jealous|proud|ashamed)(?!\p{L})/giu,
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

const quoted = (found: string[]) =>
  [...new Set(found.map((each) => each.toLocaleLowerCase(numberLocale())))]
    .map((each) => `”${each}”`)
    .join(", ");

// Filter words and named feelings matter where the reader is meant to be inside the head.
function closeNotes(narration: string, words: Words, isDeep: boolean): ProseNote[] {
  if (!isDeep) return [];
  const filters = narration.match(words.filters) ?? [];
  const feelings = narration.match(words.feelings) ?? [];
  return [
    ...(filters.length
      ? [
          {
            kind: "filter" as const,
            title: t("Filterord"),
            text: t("{words}. I deep POV visas det direkt i stället.", {
              words: quoted(filters),
            }),
          },
        ]
      : []),
    ...(feelings.length
      ? [
          {
            kind: "feeling" as const,
            title: t("Berättad känsla"),
            text: t("{words}. Visa känslan i kroppen eller i det personen gör.", {
              words: quoted(feelings),
            }),
          },
        ]
      : []),
  ];
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
    ...closeNotes(told, words, narration.deep),
    ...headNote(told, words, others, narration.voice),
    ...tenseNote(all, words, narration.tense),
  ];
}
