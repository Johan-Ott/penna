import { numberLocale, t } from "../i18n/i18n.js";
import type { ProseNote } from "./prose.js";

// The lines spoken: the right dash, a scene that is all talk, and speech verbs with an adverb.

const SPOKEN = /^\s*[\u2013\u2014\-”"“]/;
const WRONG_DASH = /^\s*[\u2014-]\s/;
const TALKING_HEADS = 6;

// "sa hon tyst": a speech verb, who, and an adverb that tells how instead of showing it.
const ADVERB_TAGS: Record<string, RegExp> = {
  "sv-SE":
    /(?<!\p{L})(?:sa|frågade|svarade|viskade|ropade|mumlade|väste)\s+(?:hon|han|hen|jag|\p{Lu}\p{Ll}+)\s+(?!att|det|mot|inte|först|sist|just)(\p{Ll}{3,}t)(?!\p{L})/gu,
  "en-GB":
    /(?<!\p{L})(?:said|asked|replied|whispered|shouted|muttered)\s+(?:\p{L}+\s+)?(\p{Ll}{3,}ly)(?!\p{L})/gu,
};

function dashNotes(lines: string[], language: string): ProseNote[] {
  if (language !== "sv-SE") return [];
  const wrong = lines.filter((line) => WRONG_DASH.test(line)).length;
  const dashed = lines.filter((line) => /^\s*–/.test(line)).length;
  const quoted = lines.filter((line) => /^\s*[”"“]/.test(line)).length;
  return [
    ...(wrong
      ? [
          {
            kind: "dash" as const,
            title: t("Talstreck"),
            text: t("{count} repliker börjar med fel streck. En svensk replik börjar med –.", {
              count: wrong,
            }),
          },
        ]
      : []),
    ...(dashed && quoted
      ? [
          {
            kind: "dash" as const,
            title: t("Talstreck"),
            text: t("Både talstreck och citattecken för repliker i scenen. Välj ett av dem."),
          },
        ]
      : []),
  ];
}

// Six lines spoken in a row with nothing done or seen between them.
function headsNote(lines: string[]): ProseNote[] {
  let run = 0;
  let longest = 0;
  for (const line of lines.filter((each) => each.trim())) {
    run = SPOKEN.test(line) ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  if (longest < TALKING_HEADS) return [];
  const text = t("{count} repliker i rad utan något som görs eller syns. En handling ger rummet.", {
    count: longest,
  });
  return [{ kind: "heads", title: t("Pratande huvuden"), text }];
}

function adverbNote(text: string, language: string): ProseNote[] {
  const pattern = ADVERB_TAGS[language];
  const found = pattern ? [...text.matchAll(pattern)].map((match) => match[0]) : [];
  if (found.length === 0) return [];
  const listed = [...new Set(found.map((each) => each.toLocaleLowerCase(numberLocale())))]
    .map((each) => `”${each}”`)
    .join(", ");
  const note = t("{tags}. Visa hur det sägs i repliken eller med en handling.", { tags: listed });
  return [{ kind: "adverb", title: t("Adverb på anföringsverb"), text: note }];
}

/** What Granska points at in the scene's lines spoken. */
export function dialogueNotes(text: string, language: string): ProseNote[] {
  const lines = text.split("\n");
  return [...dashNotes(lines, language), ...headsNote(lines), ...adverbNote(text, language)];
}
