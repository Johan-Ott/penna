import { trimSize, type BookDesign } from "./bookDesign.js";
import { typstString } from "./typstText.js";

// The pieces of the Klassisk theme that do not change with the design: the anfang, the scene
// break, the five styles and how parts and chapters open. A v() before the text would indent
// its first line, so the space under a heading belongs to the heading's own block.
const CLASSIC_PARTS = `#let anfang(letter) = text(size: 2.6em, letter)
#let scenbrytning(mark) = align(center, block(above: 1.4em, below: 1.4em, mark))
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
  align(center, block(below: 2.4em)[
    #if label != none { text(size: 0.8em, tracking: 0.12em, upper(label)) }
    #if label != none and title != none { linebreak(); v(0.4em) }
    #if title != none { text(size: 1.7em, weight: 600, title) }
  ])
}
#let kapitel(label, title) = opening(label, title, 18%)
#let del(label, title) = { opening(label, title, 30%); pagebreak() }`;

/**
 * The Klassisk theme in Typst. Page numbers start with the story and are left out on pages
 * where a part or chapter starts; even pages also carry the book's title.
 */
export function classicTemplate(design: BookDesign, title: string, language: string) {
  const { width, height } = trimSize(design.trim);
  return `#let book-title = ${typstString(title)}
#let in-story = state("in-story", false)
#set document(title: book-title)
#set page(
  width: ${width}mm,
  height: ${height}mm,
  margin: (inside: 20mm, outside: 15mm, top: 18mm, bottom: 22mm),
  footer: context {
    if not in-story.get() { return }
    let here-page = here().page()
    let starts = query(<opening>).map(found => found.location().page())
    if here-page in starts { return }
    set text(size: 0.8em)
    let number = counter(page).display()
    if calc.even(here-page) [#number #h(1em) #smallcaps(book-title)] else { align(right, number) }
  },
)
#set text(font: ${typstString(design.bodyFont)}, size: ${design.bodySize}pt, lang: ${typstString(language.slice(0, 2))}, hyphenate: true)
#set par(justify: true, leading: 0.62em, spacing: 0.62em, first-line-indent: 1.2em)
#show heading: none

${CLASSIC_PARTS}`;
}
