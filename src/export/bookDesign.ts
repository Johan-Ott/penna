import type { OutlineItem } from "./book.js";

/** How the printed book looks, kept in project.json under `design`. */
export type BookTheme = "klassisk" | "modern" | "luftig";

export interface BookDesign {
  theme: BookTheme;
  /** Width × height in millimetres, as "130x200". */
  trim: string;
  bodyFont: string;
  /** Points. */
  bodySize: number;
  dropCap: boolean;
  sceneBreak: string;
}

export const BOOK_THEMES: BookTheme[] = ["klassisk", "modern", "luftig"];

export const TRIMS: [string, string][] = [
  ["125x190", "12,5 × 19 cm"],
  ["130x200", "13 × 20 cm"],
  ["150x230", "15 × 23 cm"],
];

export const BODY_FONTS = ["Literata", "EB Garamond"];
export const BODY_SIZES = [10, 10.5, 11, 11.5];
// The marks the design offers between scenes: stars, an asterism and a long dash.
const LONG_DASH = String.fromCharCode(0x2014);
export const SCENE_BREAKS = ["* * *", "⁂", LONG_DASH];

export const DEFAULT_DESIGN: BookDesign = {
  theme: "klassisk",
  trim: "130x200",
  bodyFont: "Literata",
  bodySize: 10.5,
  dropCap: true,
  sceneBreak: "* * *",
};

const oneOf = <T>(value: unknown, allowed: T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

/** The book's design from project.json; anything missing or unknown is Klassisk's default. */
export function designOf(fields: Record<string, unknown>): BookDesign {
  const stored = (fields["design"] ?? {}) as Record<string, unknown>;
  const trims = TRIMS.map(([trim]) => trim);
  return {
    theme: oneOf(stored["theme"], BOOK_THEMES, DEFAULT_DESIGN.theme),
    trim: oneOf(stored["trim"], trims, DEFAULT_DESIGN.trim),
    bodyFont: oneOf(stored["bodyFont"], BODY_FONTS, DEFAULT_DESIGN.bodyFont),
    bodySize: oneOf(stored["bodySize"], BODY_SIZES, DEFAULT_DESIGN.bodySize),
    dropCap: typeof stored["dropCap"] === "boolean" ? stored["dropCap"] : DEFAULT_DESIGN.dropCap,
    sceneBreak: oneOf(stored["sceneBreak"], SCENE_BREAKS, DEFAULT_DESIGN.sceneBreak),
  };
}

export function trimSize(trim: string) {
  const [width = 130, height = 200] = trim.split("x").map(Number);
  return { width, height };
}

/** The book up to the end of its first chapter: enough to judge the design, quick to set. */
export function previewOutline(outline: OutlineItem[]): OutlineItem[] {
  const firstChapter = outline.findIndex((item) => item.kind === "chapter");
  const next = outline.findIndex((item, index) => index > firstChapter && item.kind !== "scene");
  return firstChapter === -1 || next === -1 ? outline : outline.slice(0, next);
}
