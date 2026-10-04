import type { Typography } from "../export/book.js";

/** The languages a book can be written in; the tag sets spellcheck and the e-book's language. */
export const BOOK_LANGUAGES: [string, string][] = [
  ["sv-SE", "Svenska"],
  ["en-GB", "English"],
  ["nb-NO", "Norsk"],
  ["da-DK", "Dansk"],
  ["fi-FI", "Suomi"],
  ["de-DE", "Deutsch"],
];

const DEFAULT_LANGUAGE = "sv-SE";

/** The book's language from project.json; Swedish when it is missing or unknown. */
export function bookLanguage(fields: Record<string, unknown>): string {
  const language = fields["language"];
  const isKnown = BOOK_LANGUAGES.some(([tag]) => tag === language);
  return isKnown ? (language as string) : DEFAULT_LANGUAGE;
}

/** Swedish and Finnish books quote with ” on both sides; the others open with “. */
export const quoteStyleFor = (language: string): Typography =>
  language === "sv-SE" || language === "fi-FI" ? "svensk" : "engelsk";
