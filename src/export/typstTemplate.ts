import {
  LEADING_EM,
  marginsOf,
  trimSize,
  type BookDesign,
  type BookTheme,
  type Margins,
} from "./bookDesign.js";
import { escapeTypst, typstString } from "./typstText.js";

const HEADINGS: Record<BookTheme, string> = {
  klassisk: `weight: 600, style: "normal"`,
  modern: `weight: 600, style: "normal"`,
  luftig: `weight: 400, style: "italic"`,
};

/** What printers ask for beyond the trim when a picture reaches the edge of the paper. */
export const BLEED_MM = 3;

export const millimetres = (value: number) => `${Math.round(value * 10) / 10}mm`;

// Typst measures how many words fit beside the two-line anfang.
const ANFANG = `#let leadin(words) = text(size: 0.8em, tracking: 0.06em, upper(words))
#let leadin-par(words) = {
  let small = calc.min(3, words.len())
  par[#leadin(words.slice(0, small).join([ ]))#if words.len() > small [ #words.slice(small).join([ ])]]
}
#let anfang(letter, words) = layout(size => {
  set par(first-line-indent: 0pt)
  let two-lines = measure(block(width: size.width, [M#linebreak()M])).height
  let one-cap = measure(text(top-edge: "cap-height", bottom-edge: "baseline", letter)).height
  let cap = text(size: 1em * (two-lines / one-cap), top-edge: "cap-height", bottom-edge: "baseline", letter)
  let cap-width = measure(cap).width + 0.15em.to-absolute()
  let opening(count) = {
    let small = calc.min(3, count)
    leadin(words.slice(0, small).join([ ]))
    if count > small [ #words.slice(small, count).join([ ])]
  }
  let fits(count) = measure(block(width: size.width - cap-width, opening(count))).height <= two-lines
  let count = 0
  while count < words.len() and fits(count + 1) { count += 1 }
  let more = words.len() > count
  grid(columns: (cap-width, 1fr), cap, [#opening(count)#if more { linebreak(justify: true) }])
  if more { par(words.slice(count).join([ ])) }
})`;

// The space under a heading belongs to its own block; a v() would be lost at a page break.
const CLASSIC_PARTS = `#let scenbrytning(mark) = align(center, block(above: 1.4em, below: 1.4em, mark))
#let stil(name, body) = {
  set par(first-line-indent: 0pt)
  let sides = (left: 1.6em, right: 1.6em)
  if name == "brev" { block(inset: sides, above: 1.2em, below: 1.2em, emph(body)) }
  else if name == "dikt" { set par(justify: false); block(inset: (left: 2.4em), above: 1.2em, below: 1.2em, body) }
  else if name == "meddelande" { set text(font: "Geist", size: 0.85em); block(inset: sides, above: 1.2em, below: 1.2em, body) }
  else if name == "centrerat" { set par(justify: false); align(center, body) }
  else if name == "hoger" { set par(justify: false); align(right, body) }
  else if name == "utan-indrag" { body }
  else if name == "kapitaler" { text(size: 0.82em, tracking: 0.06em, upper(body)) }
  else { block(inset: sides, above: 1.2em, below: 1.2em, body) }
}
// Small capitals drawn the same in every typeface: lower-case letters as smaller capitals.
#let small-caps(words) = words.clusters().map(letter => if lower(letter) == letter and upper(letter) != letter { text(size: 0.78em, upper(letter)) } else { letter }).join()
#let cased(title) = if heading-style.case == "versaler" { upper(title) } else if heading-style.case == "kapitaler" { small-caps(title) } else { title }
// The picture as large as fits in the given share of the width and height, keeping its shape.
#let fitted(path, width, height) = layout(size => {
  let natural = measure(image(path))
  let scale = calc.min(width * size.width / natural.width, height.to-absolute() / natural.height)
  image(path, width: natural.width * scale)
})
// Templates are drawn as a right-hand page; on a left-hand page they are mirrored, like the margins.
#let picture-at(shown) = context {
  let is-right = calc.odd(here().page())
  let side = if is-right { margin.inside } else { margin.outside }
  let x = if is-right { shown.x } else { trim-width - shown.x - shown.width }
  let area = box(width: shown.width, height: shown.height, clip: true, image(shown.path, width: 100%, height: 100%, fit: shown.fit))
  place(top + left, dx: x - side, dy: shown.y - margin.top, area)
}
// A picture in the text: part of the width, all of it, or a page of its own.
#let bild(path, size, caption) = {
  let shown = if size == "sida" { image(path, width: 100%, height: 85%, fit: "contain") } else { image(path, width: if size == "smal" { 60% } else { 100% }) }
  let figure = align(center, block({
    shown
    if caption != none { v(0.5em); text(size: 0.85em, style: "italic", caption) }
  }))
  if size == "sida" { align(horizon, figure); pagebreak(weak: true) } else { block(above: 1.4em, below: 1.4em, figure) }
}
#let no-extra = (subtitle: none, epigraph: none, by: none)
#let epigraph(words, by, side) = align(side, block(width: 75%, below: 2.4em, {
  set par(first-line-indent: 0pt, justify: false)
  set align(side)
  text(size: 0.9em, style: "italic", words)
  if by != none { linebreak(); v(0.2em); text(size: 0.85em)[#sym.dash.em #by] }
}))
#let opening(label, title, toc, layout, extra) = {
  [#metadata(none) <chapter-end>]
  pagebreak(weak: true, to: chapter-start)
  [#metadata(none) <opening>]
  chapter-title.update(if title == none { toc } else { title })
  heading(level: 1, toc)
  for shown in layout.pictures { picture-at(shown) }
  v(layout.drop)
  align(layout.align, block(below: 2.4em)[
    #set par(first-line-indent: 0pt, justify: false)
    #if label != none { text(size: 0.75em, tracking: 0.18em, upper(label)) }
    #if label != none and title != none { linebreak(); v(0.4em) }
    #if title != none {
      text(font: heading-style.font, size: 1.7em, weight: heading-style.weight, style: heading-style.style, cased(title))
    }
    #if extra.subtitle != none { linebreak(); v(0.3em); text(size: 0.95em, style: "italic", extra.subtitle) }
  ])
  if extra.epigraph != none { epigraph(extra.epigraph, extra.by, layout.align) }
}
// Invisible: the printed book is byte for byte the same with or without page marks.
#let pagemark(scene, block) = context [#metadata((scene: scene, block: block, page: counter(page).get().first())) <pm>]
#let kapitel(label, title, toc, layout: plain-layout, extra: no-extra) = opening(label, title, toc, layout, extra)
#let del(label, title, toc, extra: no-extra) = opening(label, title, toc, part-layout, extra)`;

// A page is left blank when a chapter must open on the right: no header or number goes on it.
const PAGE_PARTS = `#let pages-of(label) = query(label).map(found => found.location().page())
#let is-plain-page() = {
  let here-page = here().page()
  let opens = pages-of(<opening>)
  let blank = (here-page + 1) in opens and not (here-page in pages-of(<chapter-end>))
  not in-story.get() or here-page in opens or blank
}
#let running-head(content) = {
  let shown = if content == "titel" { book-title } else if content == "forfattare" { book-author } else if content == "kapitel" { chapter-title.get() } else { none }
  if shown != none { align(center, text(size: 0.65em, tracking: 0.25em, upper(shown))) }
}`;

const CHAPTER_STARTS: Record<BookDesign["chapterStart"], string> = {
  valfri: "none",
  hoger: `"odd"`,
};

const SIDES: (keyof Margins)[] = ["inside", "outside", "top", "bottom"];
const marginList = (margins: Margins, extra: number) =>
  `(${SIDES.map((side) => `${side}: ${millimetres(margins[side] + extra)}`).join(", ")})`;

// With bleed the paper grows on every side and the margins with it, so the text stays put.
function pageSetup(design: BookDesign, bleed: number) {
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
  },
  footer: context {
    if not is-plain-page() { align(center, text(size: 0.75em, counter(page).display())) }
  },
)`;
}

/** What setting the book needs beyond its design. */
export interface TemplateOptions {
  /** The scene break: Typst content, such as the stars or a picture. */
  breakMark: string;
  /** Layouts for chapters that use the standard template plainly, and for parts. */
  plainLayout: string;
  partLayout: string;
  hasBleed: boolean;
}

function headingSetup(design: BookDesign, options: TemplateOptions) {
  const style = `font: ${typstString(design.headingFont)}, ${HEADINGS[design.theme]}`;
  return `#let heading-style = (${style}, case: ${typstString(design.titleCase)})
#let plain-layout = ${options.plainLayout}
#let part-layout = ${options.partLayout}`;
}

export const textMark = (mark: string) => `[${escapeTypst(mark)}]`;

export function bookTemplate(
  design: BookDesign,
  book: { title: string; author: string },
  language: string,
  options: TemplateOptions,
) {
  return `#let book-title = ${typstString(book.title)}
#let book-author = ${typstString(book.author)}
#let chapter-start = ${CHAPTER_STARTS[design.chapterStart]}
#let in-story = state("in-story", false)
#let chapter-title = state("chapter-title", none)
${headingSetup(design, options)}
${PAGE_PARTS}
#set document(title: book-title)
${pageSetup(design, options.hasBleed ? BLEED_MM : 0)}
#set text(font: ${typstString(design.bodyFont)}, size: ${design.bodySize}pt, lang: ${typstString(language.slice(0, 2))}, hyphenate: true)
// A paragraph's single first or last line alone on a page (orphan, widow) is avoided harder.
#set text(costs: (widow: 300%, orphan: 300%))
#set par(justify: true, leading: ${LEADING_EM[design.leading]}em, spacing: ${LEADING_EM[design.leading]}em, first-line-indent: 1.2em)
#show heading: none

${ANFANG}
${CLASSIC_PARTS}
#let break-mark = ${options.breakMark}`;
}
