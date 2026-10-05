import english from "./en.json";

// Looked up by the Swedish text.
const ENGLISH: Record<string, string> = english;

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

/** The Swedish text is the key, so the code reads as the app does. `{name}` comes from `values`. */
export function t(swedish: string, values: Record<string, string | number> = {}) {
  const text = current === "en" ? (ENGLISH[swedish] ?? swedish) : swedish;
  return text.replace(/\{(\w+)\}/g, (all, name: string) => String(values[name] ?? all));
}

export const numberLocale = () => (current === "en" ? "en-GB" : "sv-SE");
