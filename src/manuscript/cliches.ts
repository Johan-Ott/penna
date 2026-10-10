import { numberLocale, t } from "../i18n/i18n.js";
import type { ProseNote } from "./prose.js";

// Worn phrases, walls of text and loud punctuation: what makes a reader skim.

const CLICHES: Record<string, string[]> = {
  "sv-SE": [
    "hjärtat bultade",
    "hjärtat slog ett extra slag",
    "en kall kåre",
    "kårar längs ryggraden",
    "inte visste att hon höll",
    "inte visste att han höll",
    "tiden stod still",
    "som en blixt från klar himmel",
    "blodet frös till is",
    "fjärilar i magen",
    "världen stannade",
    "ett leende spred sig",
    "mörkret föll",
    "tystnaden var öronbedövande",
  ],
  "en-GB": [
    "didn't know she was holding",
    "didn't know he was holding",
    "heart skipped a beat",
    "shiver ran down",
    "time stood still",
    "blood ran cold",
    "butterflies in her stomach",
    "butterflies in his stomach",
    "let out a breath",
    "the silence was deafening",
    "a smile spread across",
  ],
};

const WALL = 150;
const MANY_ELLIPSES = 6;
const LOUD = 3;

function clicheNote(lower: string, language: string): ProseNote[] {
  const found = (CLICHES[language] ?? []).filter((phrase) => lower.includes(phrase));
  if (found.length === 0) return [];
  const text = t("{phrases}. Säg det på ditt eget sätt.", {
    phrases: found.map((phrase) => `”${phrase}”`).join(", "),
  });
  return [{ kind: "cliche", title: t("Klyschor"), text }];
}

function wallNote(text: string): ProseNote[] {
  const longest = Math.max(
    0,
    ...text.split("\n").map((paragraph) => paragraph.split(/\s+/).filter(Boolean).length),
  );
  if (longest <= WALL) return [];
  const note = t("Ett stycke på {count} ord. Ett styckebyte ger läsaren andrum.", {
    count: longest,
  });
  return [{ kind: "wall", title: t("Textvägg"), text: note }];
}

// Outside the lines spoken, where a character may well shout.
function marksNote(text: string): ProseNote[] {
  const told = text
    .split("\n")
    .filter((line) => !/^\s*[\u2013\u2014\-”"“]/.test(line))
    .join("\n");
  const exclaimed = (told.match(/!/g) ?? []).length;
  const doubled = (text.match(/[!?]{2,}/g) ?? []).length;
  const ellipses = (text.match(/…|\.\.\./g) ?? []).length;
  const parts = [
    exclaimed >= LOUD && t("{count} utropstecken i berättartexten", { count: exclaimed }),
    doubled > 0 && t("{count} dubbla tecken som ?! eller !!", { count: doubled }),
    ellipses >= MANY_ELLIPSES && t("{count} tre punkter", { count: ellipses }),
  ].filter(Boolean);
  if (parts.length === 0) return [];
  const note = t("{marks}. Låt orden bära det i stället.", { marks: parts.join(", ") });
  return [{ kind: "marks", title: t("Skiljetecken"), text: note }];
}

/** What makes a reader skim: worn phrases, walls of text and loud punctuation. */
export function surfaceNotes(text: string, language: string): ProseNote[] {
  const lower = text.toLocaleLowerCase(numberLocale());
  return [...clicheNote(lower, language), ...wallNote(text), ...marksNote(text)];
}
