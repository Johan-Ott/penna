import { romanNumeral } from "../project/treeLabels.js";
import type { OutlineItem } from "./book.js";

interface BookWords {
  part: string;
  chapter: string;
  contents: string;
  cover: string;
  copyright: string;
  rights: string;
  dedication: string;
  thanks: string;
  aboutAuthor: string;
  about: (words: string) => string;
  byAuthor: (author: string) => string;
}

const WORDS: Record<string, BookWords> = {
  "sv-SE": {
    part: "Del",
    chapter: "Kapitel",
    contents: "Innehåll",
    cover: "Omslag",
    copyright: "Upphovsrätt",
    rights: "Alla rättigheter förbehållna.",
    dedication: "Dedikation",
    thanks: "Tack",
    aboutAuthor: "Om författaren",
    about: (words) => `ca ${words} ord`,
    byAuthor: (author) => `av ${author}`,
  },
  "en-GB": {
    part: "Part",
    chapter: "Chapter",
    contents: "Contents",
    cover: "Cover",
    copyright: "Copyright",
    rights: "All rights reserved.",
    dedication: "Dedication",
    thanks: "Acknowledgements",
    aboutAuthor: "About the author",
    about: (words) => `approx. ${words} words`,
    byAuthor: (author) => `by ${author}`,
  },
  "nb-NO": {
    part: "Del",
    chapter: "Kapittel",
    contents: "Innhold",
    cover: "Omslag",
    copyright: "Opphavsrett",
    rights: "Alle rettigheter forbeholdt.",
    dedication: "Dedikasjon",
    thanks: "Takk",
    aboutAuthor: "Om forfatteren",
    about: (words) => `ca. ${words} ord`,
    byAuthor: (author) => `av ${author}`,
  },
  "da-DK": {
    part: "Del",
    chapter: "Kapitel",
    contents: "Indhold",
    cover: "Omslag",
    copyright: "Ophavsret",
    rights: "Alle rettigheder forbeholdes.",
    dedication: "Dedikation",
    thanks: "Tak",
    aboutAuthor: "Om forfatteren",
    about: (words) => `ca. ${words} ord`,
    byAuthor: (author) => `af ${author}`,
  },
  "fi-FI": {
    part: "Osa",
    chapter: "Luku",
    contents: "Sisällys",
    cover: "Kansi",
    copyright: "Tekijänoikeudet",
    rights: "Kaikki oikeudet pidätetään.",
    dedication: "Omistus",
    thanks: "Kiitokset",
    aboutAuthor: "Kirjailijasta",
    about: (words) => `noin ${words} sanaa`,
    byAuthor: (author) => author,
  },
  "de-DE": {
    part: "Teil",
    chapter: "Kapitel",
    contents: "Inhalt",
    cover: "Umschlag",
    copyright: "Urheberrecht",
    rights: "Alle Rechte vorbehalten.",
    dedication: "Widmung",
    thanks: "Danksagung",
    aboutAuthor: "Zur Person",
    about: (words) => `ca. ${words} Wörter`,
    byAuthor: (author) => `von ${author}`,
  },
};

export const bookWords = (language: string): BookWords =>
  WORDS[language] ?? (WORDS["sv-SE"] as BookWords);

export function headingLabel(
  item: Extract<OutlineItem, { kind: "part" | "chapter" }>,
  language: string,
) {
  const words = bookWords(language);
  return item.kind === "part"
    ? `${words.part} ${romanNumeral(item.number)}`
    : `${words.chapter} ${item.number}`;
}

/** Rounded to hundreds, as agents and publishers expect. */
export const roundedWords = (words: number, language: string) =>
  bookWords(language).about((Math.round(words / 100) * 100).toLocaleString(language));
