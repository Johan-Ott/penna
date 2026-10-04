import { readStoredObject, writeStored, type KeyValueStorage } from "../storage/keyValueStore.js";

export type ProseFont = "serif" | "sans" | "mono";
export type TextWidth = "smal" | "normal" | "bred";
export type FocusMode = "av" | "mening" | "stycke";
export type Theme = "ljust" | "mörkt" | "system";

/** How the manuscript looks and behaves. Saved per writer, not per project. */
export interface WritingSettings {
  font: ProseFont;
  size: number;
  lineHeight: number;
  width: TextWidth;
  indent: boolean;
  focus: FocusMode;
  typewriter: boolean;
  theme: Theme;
  /** The system spell checker underlines misspelled words. */
  spellcheck: boolean;
  /** -- becomes a dash and "quotes" become Swedish ones while typing. */
  typography: boolean;
  /** Name spelling and repeated words, marked in the text and listed beside it. */
  review: boolean;
  /** A word used again within this many sentences is marked. */
  repeatWindow: number;
}

export const DEFAULT_SETTINGS: WritingSettings = {
  font: "serif",
  size: 19,
  lineHeight: 1.8,
  width: "normal",
  indent: true,
  focus: "stycke",
  typewriter: true,
  theme: "system",
  spellcheck: true,
  typography: true,
  review: true,
  repeatWindow: 3,
};

const STORAGE_KEY = "penna.writing";
const MIN_SIZE = 14;
const MAX_SIZE = 28;
const LINE_HEIGHTS = [1.5, 1.6, 1.8, 2];
export const REPEAT_WINDOWS = [2, 3, 4, 5];
const FONTS: Record<ProseFont, string> = {
  serif: '"Literata", Georgia, serif',
  sans: '"Geist Sans", system-ui, sans-serif',
  mono: '"Geist Mono", Consolas, monospace',
};
const THEMES: Record<Theme, true> = { ljust: true, mörkt: true, system: true };
const WIDTHS: Record<TextWidth, string> = { smal: "520px", normal: "600px", bred: "720px" };

const isOneOf = <T extends string>(value: unknown, options: Record<T, unknown>): value is T =>
  typeof value === "string" && value in options;

// Every stored value is checked on its own, so one bad value never resets the others.
function validated(stored: Record<string, unknown>): WritingSettings {
  const pick = <K extends keyof WritingSettings>(key: K, isValid: (value: unknown) => boolean) =>
    (isValid(stored[key]) ? stored[key] : DEFAULT_SETTINGS[key]) as WritingSettings[K];
  const isSize = (value: unknown) =>
    typeof value === "number" && value >= MIN_SIZE && value <= MAX_SIZE;
  const isBoolean = (value: unknown) => typeof value === "boolean";
  return {
    font: pick("font", (value) => isOneOf(value, FONTS)),
    size: pick("size", isSize),
    lineHeight: pick("lineHeight", (value) => LINE_HEIGHTS.includes(value as number)),
    width: pick("width", (value) => isOneOf(value, WIDTHS)),
    indent: pick("indent", isBoolean),
    focus: pick("focus", (value) => ["av", "mening", "stycke"].includes(value as string)),
    typewriter: pick("typewriter", isBoolean),
    // Before the theme had three choices, dark was a switch on top of the system theme.
    theme:
      stored["darkTheme"] === true ? "mörkt" : pick("theme", (value) => isOneOf(value, THEMES)),
    spellcheck: pick("spellcheck", isBoolean),
    typography: pick("typography", isBoolean),
    review: pick("review", isBoolean),
    repeatWindow: pick("repeatWindow", (value) => REPEAT_WINDOWS.includes(value as number)),
  };
}

export const loadSettings = (storage: KeyValueStorage): WritingSettings =>
  validated(readStoredObject(storage, STORAGE_KEY));

export const saveSettings = (storage: KeyValueStorage, settings: WritingSettings) =>
  writeStored(storage, STORAGE_KEY, settings);

export const changeSize = (settings: WritingSettings, step: 1 | -1): WritingSettings => ({
  ...settings,
  size: Math.min(MAX_SIZE, Math.max(MIN_SIZE, settings.size + step)),
});

export function nextLineHeight(current: number): number {
  return LINE_HEIGHTS[(LINE_HEIGHTS.indexOf(current) + 1) % LINE_HEIGHTS.length] ?? 1.8;
}

export const nextWidth = (current: TextWidth): TextWidth =>
  (({ smal: "normal", normal: "bred", bred: "smal" }) as const)[current];

/** CSS custom properties for the manuscript element. */
export function proseStyle(settings: WritingSettings): Record<string, string> {
  return {
    "--prose-font": FONTS[settings.font],
    "--prose-size": `${settings.size}px`,
    "--prose-line-height": String(settings.lineHeight),
    "--prose-width": WIDTHS[settings.width],
    "--prose-indent": settings.indent ? "1.5em" : "0",
  };
}

export const THEME_LABELS: Record<Theme, string> = {
  ljust: "Ljust",
  mörkt: "Mörkt",
  system: "System",
};

/** The dark switch in the Aa panel: dark, or back to following the system. */
export const toggleDark = (settings: WritingSettings): WritingSettings => ({
  ...settings,
  theme: settings.theme === "mörkt" ? "system" : "mörkt",
});
