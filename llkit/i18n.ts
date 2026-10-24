import kitEnglish from "./en.json";

// Looked up by the Swedish text: llkit's own texts, and each app's, handed in as it starts.
const ENGLISH: Record<string, string> = { ...kitEnglish };

/** An app's English texts, by their Swedish; handed in before any of them is shown. */
export function addEnglish(texts: Record<string, string>) {
  Object.assign(ENGLISH, texts);
}

export type UiLanguage = "sv" | "en" | "nb" | "da" | "de";

/** Swedish and English come with the app; the others are fetched the first time they are chosen. */
export const UI_LANGUAGES: [UiLanguage, string][] = [
  ["sv", "Svenska"],
  ["en", "English"],
  ["nb", "Norsk bokmål"],
  ["da", "Dansk"],
  ["de", "Deutsch"],
];

export const isBuiltIn = (language: UiLanguage) => language === "sv" || language === "en";

export const isUiLanguage = (value: unknown): value is UiLanguage =>
  UI_LANGUAGES.some(([language]) => language === value);

const LOCALES = new Map<UiLanguage, string>([
  ["sv", "sv-SE"],
  ["en", "en-GB"],
  ["nb", "nb-NO"],
  ["da", "da-DK"],
  ["de", "de-DE"],
]);

// A fetched language's texts, by their Swedish; what it lacks shows in English.
let pack: Record<string, string> = {};

export function addLanguagePack(texts: Record<string, string>) {
  pack = texts;
}

let current: UiLanguage = "sv";

/** Set once at start, before anything is drawn; a change reloads the window. */
export function setUiLanguage(language: UiLanguage) {
  current = language;
}

/** The Swedish text is the key, so the code reads as the app does. `{name}` comes from `values`. */
export function t(swedish: string, values: Record<string, string | number> = {}) {
  const text = current === "sv" ? swedish : (pack[swedish] ?? ENGLISH[swedish] ?? swedish);
  return text.replace(/\{(\w+)\}/g, (all, name: string) => String(values[name] ?? all));
}

export const uiLanguage = () => current;

/** Swedish, or else English for what only those two have, such as templates and release notes. */
export const isSwedish = () => current === "sv";

export const numberLocale = () => LOCALES.get(current) ?? "en-GB";

/** A count as the interface's language writes it: 1 234 in Swedish, 1,234 in English. */
export const formatNumber = (count: number) => Math.round(count).toLocaleString(numberLocale());
