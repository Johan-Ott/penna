import { trimSize, type BookDesign, type BookTheme } from "./bookDesign.js";
import { typstString } from "./typstText.js";

const THEMES: Record<BookTheme, { heading: string; margins: string }> = {
  klassisk: {
    heading: `font: "Literata", weight: 600, style: "normal", align: center`,
    margins: "(inside: 20mm, outside: 15mm, top: 18mm, bottom: 20mm)",
  },
  modern: {
    heading: `font: "Geist", weight: 600, style: "normal", align: left`,
    margins: "(inside: 20mm, outside: 15mm, top: 18mm, bottom: 20mm)",
  },
  luftig: {
    heading: `font: "Literata", weight: 400, style: "italic", align: center`,
    margins: "(inside: 24mm, outside: 19mm, top: 24mm, bottom: 24mm)",
  },
};

// Typst measures how many words fit beside the two-line anfang.
const ANFANG = `#let leadin(words) = text(size: 0.8em, tracking: 0.06em, upper(words))
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
  else { block(inset: sides, above: 1.2em, below: 1.2em, body) }
}
#let opening(label, title, drop) = {
  pagebreak(weak: true)
  [#metadata(none) <opening>]
  heading(level: 1, if title == none { label } else if label == none { title } else [#label. #title])
  v(drop)
  align(heading-style.align, block(below: 2.4em)[
    #set par(first-line-indent: 0pt)
    #if label != none { text(size: 0.75em, tracking: 0.18em, upper(label)) }
    #if label != none and title != none { linebreak(); v(0.4em) }
    #if title != none {
      text(font: heading-style.font, size: 1.7em, weight: heading-style.weight, style: heading-style.style, title)
    }
  ])
}
#let kapitel(label, title) = opening(label, title, 18%)
#let del(label, title) = { opening(label, title, 30%); pagebreak() }`;

/** The title at the head of each page, except where a part or chapter opens. */
export function bookTemplate(design: BookDesign, title: string, language: string) {
  const { width, height } = trimSize(design.trim);
  const theme = THEMES[design.theme];
  return `#let book-title = ${typstString(title)}
#let in-story = state("in-story", false)
#let heading-style = (${theme.heading})
#set document(title: book-title)
#set page(
  width: ${width}mm,
  height: ${height}mm,
  margin: ${theme.margins},
  header: context {
    if not in-story.get() { return }
    let here-page = here().page()
    if here-page in query(<opening>).map(found => found.location().page()) { return }
    align(center, text(size: 0.65em, tracking: 0.25em, upper(book-title)))
  },
  footer: context {
    if in-story.get() { align(center, text(size: 0.75em, counter(page).display())) }
  },
)
#set text(font: ${typstString(design.bodyFont)}, size: ${design.bodySize}pt, lang: ${typstString(language.slice(0, 2))}, hyphenate: true)
#set par(justify: true, leading: 0.62em, spacing: 0.62em, first-line-indent: 1.2em)
#show heading: none

${ANFANG}
${CLASSIC_PARTS}`;
}
