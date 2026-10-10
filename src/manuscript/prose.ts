import { numberLocale, t } from "../i18n/i18n.js";

/** Something in a scene's prose worth a second look: a long sentence, a filler word, a loud tag. */
export interface ProseNote {
  kind: "long" | "filler" | "tag" | "voice" | "filter" | "head" | "tense";
  title: string;
  text: string;
}

const LONG_SENTENCE = 35;
const FILLER_TIMES = 3;

// Words that seldom carry meaning; Granska says so when one comes back often in a scene.
const FILLERS: Record<string, string[]> = {
  "sv-SE": [
    "bara",
    "liksom",
    "faktiskt",
    "egentligen",
    "verkligen",
    "ganska",
    "väldigt",
    "typ",
    "nästan",
  ],
  "en-GB": ["just", "really", "very", "actually", "quite", "somehow", "literally", "basically"],
};

// Speech verbs that draw the eye from what is said; "sa" and "said" disappear on the page.
const LOUD_TAGS: Record<string, string[]> = {
  "sv-SE": ["utbrast", "väste", "fräste", "morrade", "fnös", "flinade", "kvittrade", "genmälde"],
  "en-GB": [
    "exclaimed",
    "hissed",
    "snapped",
    "growled",
    "snorted",
    "chirped",
    "retorted",
    "barked",
  ],
};

const wordsOf = (text: string) => text.match(/[\p{L}\p{N}]+/gu) ?? [];

function longSentences(text: string): ProseNote[] {
  const sentences = text.split(/(?<=[.!?…])\s+|\n+/);
  return sentences.flatMap((sentence) => {
    const words = wordsOf(sentence);
    if (words.length <= LONG_SENTENCE) return [];
    const start = words.slice(0, 6).join(" ");
    return [
      {
        kind: "long",
        title: t("Lång mening"),
        text: t("”{start} …” har {count} ord.", { start, count: words.length }),
      },
    ];
  });
}

const counted = (text: string, words: string[]) => {
  const all = wordsOf(text.toLocaleLowerCase(numberLocale()));
  return words
    .map((word) => [word, all.filter((each) => each === word).length] as const)
    .filter(([, count]) => count > 0);
};

const listed = (found: (readonly [string, number])[]) =>
  found.map(([word, count]) => `”${word}” ${count}`).join(", ");

/** What Granska points at in the prose itself, in the book's language where it knows the words. */
export function proseNotes(text: string, language: string): ProseNote[] {
  const fillers = counted(text, FILLERS[language] ?? []).filter(
    ([, count]) => count >= FILLER_TIMES,
  );
  const tags = counted(text, LOUD_TAGS[language] ?? []);
  return [
    ...longSentences(text),
    ...(fillers.length
      ? [{ kind: "filler" as const, title: t("Utfyllnadsord"), text: listed(fillers) }]
      : []),
    ...(tags.length
      ? [
          {
            kind: "tag" as const,
            title: t("Anföringsverb"),
            text: t("{tags}. Ett enkelt ”sa” syns minst.", { tags: listed(tags) }),
          },
        ]
      : []),
  ];
}
