import { marginsOf, trimSize, type BookDesign, type Margins } from "./bookDesign.js";
import { typstString } from "./typstText.js";

// The page: its size and margins, the running head and the page number, set from the design.

/** What printers ask for beyond the trim when a picture reaches the edge of the paper. */
export const BLEED_MM = 3;

export const millimetres = (value: number) => `${Math.round(value * 10) / 10}mm`;

// A page is left blank when a chapter must open on the right: no header or number goes on it.
export const PAGE_PARTS = `#let pages-of(label) = query(label).map(found => found.location().page())
#let is-plain-page() = {
  let here-page = here().page()
  let opens = pages-of(<opening>)
  let blank = (here-page + 1) in opens and not (here-page in pages-of(<chapter-end>))
  not in-story.get() or here-page in opens or blank
}
#let is-opening() = in-story.get() and here().page() in pages-of(<opening>)
#let outer() = if calc.odd(here().page()) { right } else { left }
#let folio() = text(size: 0.75em, counter(page).display())
#let running-head(content) = {
  let shown = if content == "titel" { book-title } else if content == "forfattare" { book-author } else if content == "kapitel" { chapter-title.get() } else { none }
  if shown != none { align(center, text(size: 0.65em, tracking: 0.25em, upper(shown))) }
}`;

export const CHAPTER_STARTS: Record<BookDesign["chapterStart"], string> = {
  valfri: "none",
  hoger: `"odd"`,
};

const SIDES: (keyof Margins)[] = ["inside", "outside", "top", "bottom"];
const marginList = (margins: Margins, extra: number) =>
  `(${SIDES.map((side) => `${side}: ${millimetres(margins[side] + extra)}`).join(", ")})`;

// A chapter's first page, numbered only if the design asks, has its number at the foot's centre.
function footerTypst({ folio, openingFolio }: BookDesign) {
  const place = folio === "ytterhorn" ? "outer()" : "center";
  const opening = openingFolio ? "if is-opening() { align(center, folio()) } else " : "";
  const body = folio === "overst" ? "" : `if not is-plain-page() { align(${place}, folio()) }`;
  return body || opening ? `${opening}${body || "{}"}` : "";
}

// With bleed the paper grows on every side and the margins with it, so the text stays put.
export function pageSetup(design: BookDesign, bleed: number) {
  const { width, height } = trimSize(design.trim);
  const margins = marginsOf(design);
  const sides = `if calc.odd(here().page()) { ${typstString(design.headerRight)} } else { ${typstString(design.headerLeft)} }`;
  return `#let margin = ${marginList(margins, 0)}
#let trim-width = ${millimetres(width)}
#set page(
  width: ${millimetres(width + 2 * bleed)},
  height: ${millimetres(height + 2 * bleed)},
  margin: ${marginList(margins, bleed)},
  header: context {
    [#metadata(counter(page).get().first()) <sheet>]
    if not is-plain-page() { running-head(${sides}) }
    ${design.folio === "overst" ? "if not is-plain-page() { place(top + outer(), folio()) }" : ""}
  },
  footer: context {
    ${footerTypst(design)}
  },
)`;
}
