import english from "./en.json";

// English for the interface, looked up by the Swedish text. Kept as data, beside this file.
const ENGLISH: Record<string, string> = english;

/** The languages Penna's own interface is written in. The book's language is set per book. */
export type UiLanguage = "sv" | "en";

export const UI_LANGUAGES: [UiLanguage, string][] = [
  ["sv", "Svenska"],
  ["en", "English"],
];

let current: UiLanguage = "sv";

/** Set once at start, before anything is drawn; a change reloads the window. */
export function setUiLanguage(language: UiLanguage) {
  current = language;
}

/**
 * The interface text in the chosen language. The Swedish text is the key, so the code reads
 * as the app does; `{name}` is filled in from `values`.
 */
export function t(swedish: string, values: Record<string, string | number> = {}) {
  const text = current === "en" ? (ENGLISH[swedish] ?? swedish) : swedish;
  return text.replace(/\{(\w+)\}/g, (all, name: string) => String(values[name] ?? all));
}

/** How numbers are written in the interface: 12 345 in Swedish, 12,345 in English. */
export const numberLocale = () => (current === "en" ? "en-GB" : "sv-SE");
