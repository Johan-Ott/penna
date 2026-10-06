import { t } from "../i18n/i18n.js";

// A chapter opening is a template: picture areas on the page and where the heading sits.
// The book has a few; each chapter picks one and can put its own pictures in its areas.

export type HeadingAlign = "mitten" | "vanster";
/** "fyll": the picture covers the area and is cropped. "hela": all of it shows, inside the area. */
export type PictureFit = "fyll" | "hela";

/** A picture area, measured as shares of the page's width and height from its top left corner. */
export interface PictureArea {
  id: string;
  /** The picture in bilder/ that the template puts here; "" leaves the area empty. */
  picture: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fit: PictureFit;
}

export interface OpeningTemplate {
  id: string;
  name: string;
  /** How far down the page the heading starts, as a share of the page's height. */
  headingTop: number;
  headingAlign: HeadingAlign;
  areas: PictureArea[];
}

/** What a chapter changes in its template: which one, and its own picture per area. */
export interface ChapterOpening {
  opening?: string;
  pictures?: Record<string, string>;
}

const area = (id: string, rect: Omit<PictureArea, "id" | "picture">): PictureArea => ({
  id,
  picture: "",
  ...rect,
});

/** The starting points a new template is made from. */
export const OPENING_PRESETS: OpeningTemplate[] = [
  { id: "klassisk", name: "Klassisk", headingTop: 0.24, headingAlign: "mitten", areas: [] },
  {
    id: "ornament",
    name: "Ornament",
    headingTop: 0.27,
    headingAlign: "mitten",
    areas: [area("bild1", { x: 0.35, y: 0.17, width: 0.3, height: 0.07, fit: "hela" })],
  },
  {
    id: "bild-overst",
    name: "Bild överst",
    headingTop: 0.45,
    headingAlign: "mitten",
    areas: [area("bild1", { x: 0, y: 0, width: 1, height: 0.38, fit: "fyll" })],
  },
  {
    id: "bild-kanten",
    name: "Bild i kanten",
    headingTop: 0.3,
    headingAlign: "vanster",
    areas: [area("bild1", { x: 0.88, y: 0, width: 0.12, height: 1, fit: "fyll" })],
  },
];

const DEFAULT_OPENINGS = [OPENING_PRESETS[0] as OpeningTemplate];

// Only a plain file name, so a design can never point outside the book's bilder/ folder.
export const isPictureName = (value: unknown): value is string =>
  typeof value === "string" && /^[\w.-]+\.(png|jpe?g)$/i.test(value);

const share = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;

function areaOf(value: unknown, index: number): PictureArea {
  const stored = (value ?? {}) as Record<string, unknown>;
  return {
    id: typeof stored["id"] === "string" ? stored["id"] : `bild${index + 1}`,
    picture: isPictureName(stored["picture"]) ? stored["picture"] : "",
    x: share(stored["x"], 0),
    y: share(stored["y"], 0),
    width: share(stored["width"], 0.3),
    height: share(stored["height"], 0.1),
    fit: stored["fit"] === "fyll" ? "fyll" : "hela",
  };
}

function templateOf(value: unknown, index: number): OpeningTemplate {
  const stored = (value ?? {}) as Record<string, unknown>;
  const areas = Array.isArray(stored["areas"]) ? stored["areas"] : [];
  return {
    id: typeof stored["id"] === "string" ? stored["id"] : `mall${index + 1}`,
    name:
      typeof stored["name"] === "string"
        ? stored["name"]
        : t("Mall {number}", { number: index + 1 }),
    headingTop: share(stored["headingTop"], 0.24),
    headingAlign: stored["headingAlign"] === "vanster" ? "vanster" : "mitten",
    areas: areas.map(areaOf),
  };
}

/** The stored templates, or Klassisk alone when there are none. */
export function openingsOf(value: unknown): OpeningTemplate[] {
  const templates = Array.isArray(value) ? value.map(templateOf) : [];
  return templates.length ? templates : DEFAULT_OPENINGS;
}

/** The chapter's template, or the book's standard one. */
export function openingFor(
  templates: OpeningTemplate[],
  standard: string,
  chapter: ChapterOpening,
): OpeningTemplate {
  const find = (id: string | undefined) => templates.find((template) => template.id === id);
  return find(chapter.opening) ?? find(standard) ?? (templates[0] as OpeningTemplate);
}

/** Each area with the picture it shows in this chapter: the chapter's own, or the template's. */
export const picturesIn = (template: OpeningTemplate, chapter: ChapterOpening) =>
  template.areas.map((shown) => ({
    ...shown,
    picture: chapter.pictures?.[shown.id] || shown.picture,
  }));

const EDGE = 0.002;

/** A picture that reaches the paper's edge needs bleed when printed. */
export const touchesEdge = (shown: PictureArea) =>
  shown.x <= EDGE ||
  shown.y <= EDGE ||
  shown.x + shown.width >= 1 - EDGE ||
  shown.y + shown.height >= 1 - EDGE;

/** A new id that no template or area in `taken` has. */
export function freshId(prefix: string, taken: { id: string }[]) {
  let number = taken.length + 1;
  while (taken.some((item) => item.id === `${prefix}${number}`)) number += 1;
  return `${prefix}${number}`;
}

/** A new template from a preset, with an id and a name no other template has. */
export function templateFrom(
  preset: OpeningTemplate,
  existing: OpeningTemplate[],
): OpeningTemplate {
  const names = new Set(existing.map((template) => template.name));
  let name = preset.name;
  for (let number = 2; names.has(name); number += 1) name = `${preset.name} ${number}`;
  return {
    ...preset,
    id: freshId("mall", existing),
    name,
    areas: preset.areas.map((shown) => ({ ...shown })),
  };
}

/** The templates with one of them changed. */
export const withTemplate = (templates: OpeningTemplate[], changed: OpeningTemplate) =>
  templates.map((template) => (template.id === changed.id ? changed : template));

/** Quick places for a picture area: across the top, the whole page, along the edge, an ornament. */
export const AREA_PLACES: { name: string; rect: Omit<PictureArea, "id" | "picture"> }[] = [
  { name: "Hela toppen", rect: { x: 0, y: 0, width: 1, height: 0.38, fit: "fyll" } },
  { name: "Hela sidan", rect: { x: 0, y: 0, width: 1, height: 1, fit: "fyll" } },
  { name: "Längs kanten", rect: { x: 0.88, y: 0, width: 0.12, height: 1, fit: "fyll" } },
  { name: "Ornament", rect: { x: 0.35, y: 0.17, width: 0.3, height: 0.07, fit: "hela" } },
];

/** A new area in the middle of the page, ready to be moved. */
export const newArea = (template: OpeningTemplate): PictureArea => ({
  id: freshId("bild", template.areas),
  picture: "",
  x: 0.3,
  y: 0.08,
  width: 0.4,
  height: 0.12,
  fit: "hela",
});
