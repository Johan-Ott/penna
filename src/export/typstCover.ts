import { trimSize } from "./bookDesign.js";
import { BLEED_MM, millimetres } from "./typstPage.js";
import { escapeTypst, typstString } from "./typstText.js";

/** The paper the book is printed on decides how thick its spine is. */
export type CoverPaper = "vitt" | "kramvitt";

/** Millimetres per page, as Amazon KDP gives them for its white and cream paper. */
const PAGE_THICKNESS: Record<CoverPaper, number> = { vitt: 0.0572, kramvitt: 0.0635 };

/** Below this many pages printers allow no text on the spine. */
export const SPINE_TEXT_PAGES = 79;

/** The colours a cover can have, by name: dark ones get light text. */
export const COVER_COLORS: Record<string, { background: string; text: string }> = {
  natt: { background: "#1d2433", text: "#f4efe6" },
  skog: { background: "#2f3e2e", text: "#f4efe6" },
  vin: { background: "#5c1f24", text: "#f4efe6" },
  sand: { background: "#e8dcc5", text: "#2a2420" },
  vit: { background: "#ffffff", text: "#1a1a1a" },
};

export interface CoverInput {
  trim: string;
  /** Every page of the printed book, blank ones too. */
  pages: number;
  paper: CoverPaper;
  color: string;
  title: string;
  author: string;
  backText: string;
  /** Typst's path to the front picture, or null for a front of type only. */
  frontPicture: string | null;
}

export const spineWidth = (pages: number, paper: CoverPaper) =>
  Math.round(pages * PAGE_THICKNESS[paper] * 10) / 10;

/** Back, spine and front side by side, with bleed all round, as printers ask for one PDF. */
export function coverSource(input: CoverInput): string {
  const { width, height } = trimSize(input.trim);
  const spine = spineWidth(input.pages, input.paper);
  const colors =
    COVER_COLORS[input.color] ?? (COVER_COLORS["natt"] as { background: string; text: string });
  const paragraphs = input.backText
    .split(/\n\s*\n/)
    .map((paragraph) => escapeTypst(paragraph.trim()))
    .filter(Boolean)
    .join("\n\n");
  const front = input.frontPicture
    ? `place(top + left, dx: back-width + spine, image(${typstString(input.frontPicture)}, width: panel-width, height: full-height, fit: "cover"))`
    : `place(top + left, dx: back-width + spine, box(width: panel-width, height: full-height, align(center + horizon, { text(size: 26pt, weight: 600, title); v(1.2em); text(size: 14pt, author) })))`;
  return `#let title = ${typstString(input.title)}
#let author = ${typstString(input.author)}
#let bleed = ${millimetres(BLEED_MM)}
#let spine = ${millimetres(spine)}
#let back-width = ${millimetres(width)} + bleed
#let panel-width = ${millimetres(width)} + bleed
#let full-height = ${millimetres(height)} + 2 * bleed
#set page(width: 2 * panel-width + spine, height: full-height, margin: 0mm, fill: rgb(${typstString(colors.background)}))
#set text(font: "Literata", fill: rgb(${typstString(colors.text)}), lang: "sv")
#set par(justify: true, leading: 0.7em, spacing: 0.9em)
// Back: the text kept 15 mm from the trim, and clear of the lower part where printers put the barcode.
#place(top + left, dx: bleed + 15mm, dy: bleed + 20mm, box(width: ${millimetres(width)} - 30mm, text(size: 10.5pt)[${paragraphs}]))
${input.pages >= SPINE_TEXT_PAGES ? `#place(top + left, dx: back-width, box(width: spine, height: full-height, align(center + horizon, rotate(90deg, reflow: true, text(size: 9pt, tracking: 0.08em)[#upper(title) #h(1.5em) #author]))))` : ""}
#${front}
`;
}

/** What the writer chose for the print cover; kept in project.json under `printCover`. */
export interface PrintCover {
  paper: CoverPaper;
  color: string;
  backText: string;
}

export function printCoverOf(fields: Record<string, unknown>): PrintCover {
  const stored = (fields["printCover"] ?? {}) as Record<string, unknown>;
  const color =
    typeof stored["color"] === "string" && stored["color"] in COVER_COLORS
      ? stored["color"]
      : "natt";
  return {
    paper: stored["paper"] === "kramvitt" ? "kramvitt" : "vitt",
    color,
    backText: typeof stored["backText"] === "string" ? stored["backText"] : "",
  };
}
