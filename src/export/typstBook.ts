import type { Node } from "prosemirror-model";
import type { BookDetails, OutlineItem, Typography } from "./book.js";
import type { BookExtras } from "./bookParts.js";
import type { BookDesign } from "./bookDesign.js";
import { bookWords, contentsLabel, designedLabel } from "./bookWords.js";
import {
  breakMark,
  chapterLayout,
  needsBleed,
  partLayout,
  picturePath,
  plainLayout,
} from "./typstOpening.js";
import { bookTemplate } from "./typstTemplate.js";
import { escapeTypst, sceneTypst, typstString } from "./typstText.js";

/** The same input gives the preview and the PDF. */
export interface PrintInput {
  book: BookDetails;
  outline: OutlineItem[];
  scenes: Map<string, Node>;
  typography: Typography;
  language: string;
  design: BookDesign;
  parts: { hasTitlePage: boolean; hasCopyrightPage: boolean; hasContents: boolean };
  extras: BookExtras;
  year: number;
  /** For the page map: each block and the book's end say which page they land on. */
  markPages?: boolean;
  /** The pictures in the book's bilder/ folder that the design and chapters use, by file name. */
  images?: Map<string, Uint8Array>;
}

/** The files the source refers to, for the compiler. */
export function typstFiles(input: PrintInput): Map<string, Uint8Array> {
  return new Map([...(input.images ?? [])].map(([name, bytes]) => [picturePath(name), bytes]));
}

/** True when a picture reaches the paper's edge, so the PDF has 3 mm bleed for the printer. */
const bookHasBleed = (input: PrintInput) =>
  needsBleed(
    input.design,
    input.outline.flatMap((item) => (item.kind === "chapter" ? [item] : [])),
    input.images,
  );

const optional = (text: string) => (text ? typstString(text) : "none");

function titlePage({ book }: PrintInput) {
  const lines = [`#text(size: 2em, weight: 600, ${typstString(book.title)})`];
  if (book.subtitle) lines.push(`#v(0.6em) #text(size: 1.1em, ${typstString(book.subtitle)})`);
  if (book.author) lines.push(`#v(2.4em) #text(size: 1.1em, ${typstString(book.author)})`);
  return `#v(25%)\n#align(center)[\n${lines.join(" \\\n")}\n]\n#pagebreak()`;
}

function copyrightPage({ book, year, language }: PrintInput) {
  const owner = escapeTypst(book.author || book.title);
  const { rights } = bookWords(language);
  return `#v(1fr)\n#text(size: 0.8em)[© ${year} ${owner} \\\n${escapeTypst(rights)}]\n#pagebreak()`;
}

function frontMatter(input: PrintInput): string[] {
  const { parts, extras } = input;
  const pages: string[] = [];
  if (parts.hasTitlePage) pages.push(titlePage(input));
  if (parts.hasCopyrightPage) pages.push(copyrightPage(input));
  if (extras.dedication) {
    pages.push(`#v(30%)\n#align(center, emph[${escapeTypst(extras.dedication)}])\n#pagebreak()`);
  }
  if (parts.hasContents) {
    const title = typstString(bookWords(input.language).contents);
    pages.push(`#outline(title: ${title}, depth: 1)\n#pagebreak()`);
  }
  return pages;
}

function sceneParts(input: PrintInput, id: string, previous: OutlineItem["kind"] | null) {
  const parts: string[] = [];
  const doc = input.scenes.get(id);
  // A part page stands alone; a chapter after it breaks the page itself.
  if (previous === "part") parts.push("#pagebreak()");
  if (previous === "scene") parts.push("#scenbrytning(break-mark)");
  const opensChapter = previous === "chapter";
  const hasDropCap = input.design.dropCap && opensChapter;
  const hasLeadIn = input.design.leadIn && opensChapter;
  const markScene = input.markPages ? id : undefined;
  const picturePathOf = (name: string) => (input.images?.has(name) ? picturePath(name) : null);
  const options = { ...input, hasDropCap, hasLeadIn, markScene, picturePath: picturePathOf };
  if (doc) parts.push(sceneTypst(doc, options));
  return parts;
}

type Opening = Extract<OutlineItem, { kind: "part" | "chapter" }>;

function openingCall(input: PrintInput, item: Opening, hasBleed: boolean) {
  const label = designedLabel(item, input.language, input.design.chapterLabel);
  const extra = [
    `subtitle: ${optional(item.subtitle ?? "")}`,
    `epigraph: ${optional(item.epigraph ?? "")}`,
    `by: ${optional(item.epigraphBy ?? "")}`,
  ].join(", ");
  const toc = typstString(contentsLabel(item, input.language));
  const start = `${optional(label ?? "")}, ${optional(item.title)}, ${toc}`;
  if (item.kind === "part") return `#del(${start}, extra: (${extra}))`;
  const layout = chapterLayout(input.design, item, input.images, hasBleed);
  return `#kapitel(${start}, layout: ${layout}, extra: (${extra}))`;
}

function story(input: PrintInput, hasBleed: boolean): string[] {
  // The story starts on a right-hand page with page 1, as printed books do.
  const parts: string[] = [
    '#pagebreak(weak: true, to: "odd")\n#in-story.update(true)\n#counter(page).update(1)',
  ];
  let previous: OutlineItem["kind"] | null = null;
  for (const item of input.outline) {
    if (item.kind !== "scene") parts.push(openingCall(input, item, hasBleed));
    else parts.push(...sceneParts(input, item.id, previous));
    previous = item.kind;
  }
  return parts;
}

// Thanks and about the author open like chapters, so the contents list them.
function backMatter({ extras, language }: PrintInput): string[] {
  const words = bookWords(language);
  const pages: [string, string | undefined][] = [
    [words.thanks, extras.thanks],
    [words.aboutAuthor, extras.about],
  ];
  return pages.flatMap(([title, text]) => {
    if (!text?.trim()) return [];
    const paragraphs = text.split(/\n\s*\n/).map((paragraph) => escapeTypst(paragraph.trim()));
    const name = typstString(title);
    return [`#kapitel(none, ${name}, ${name})\n${paragraphs.join("\n\n")}`];
  });
}

export function typstSource(input: PrintInput): string {
  const { design } = input;
  const hasBleed = bookHasBleed(input);
  const options = {
    breakMark: breakMark(design, input.images),
    plainLayout: plainLayout(design),
    partLayout: partLayout(design),
    hasBleed,
  };
  return [
    bookTemplate(design, input.book, input.language, options),
    ...frontMatter(input),
    ...story(input, hasBleed),
    ...backMatter(input),
  ].join("\n\n");
}
