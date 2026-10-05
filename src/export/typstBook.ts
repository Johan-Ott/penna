import type { Node } from "prosemirror-model";
import type { BookDetails, OutlineItem, Typography } from "./book.js";
import type { BookExtras } from "./bookParts.js";
import type { BookDesign } from "./bookDesign.js";
import { bookWords, headingLabel } from "./bookWords.js";
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
}

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

function story(input: PrintInput): string[] {
  const parts: string[] = ["#in-story.update(true)\n#counter(page).update(1)"];
  let previous: OutlineItem["kind"] | null = null;
  for (const item of input.outline) {
    if (item.kind !== "scene") {
      const call = item.kind === "part" ? "del" : "kapitel";
      parts.push(
        `#${call}(${typstString(headingLabel(item, input.language))}, ${optional(item.title)})`,
      );
    } else {
      const doc = input.scenes.get(item.id);
      if (previous === "scene")
        parts.push(`#scenbrytning[${escapeTypst(input.design.sceneBreak)}]`);
      const hasDropCap = input.design.dropCap && previous === "chapter";
      if (doc) parts.push(sceneTypst(doc, { ...input, ...input.design, hasDropCap }));
    }
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
    return [`#kapitel(none, ${typstString(title)})\n${paragraphs.join("\n\n")}`];
  });
}

export function typstSource(input: PrintInput): string {
  return [
    bookTemplate(input.design, input.book.title, input.language),
    ...frontMatter(input),
    ...story(input),
    ...backMatter(input),
  ].join("\n\n");
}
