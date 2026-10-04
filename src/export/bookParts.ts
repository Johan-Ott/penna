import type { BookDetails } from "./book.js";
import { bookWords } from "./bookWords.js";
import { escapeXml } from "./xhtml.js";

/** One XHTML file in the book; `tocLabel` puts it in the table of contents. */
export interface Page {
  id: string;
  title: string;
  body: string;
  tocLabel?: string;
}

/** The writer's own words around the story; a part is left out when it has no text. */
export interface BookExtras {
  dedication?: string;
  thanks?: string;
  about?: string;
}

interface FrontInput {
  book: BookDetails;
  language: string;
  modified: Date;
  coverName: string;
  parts: { hasTitlePage: boolean; hasCopyrightPage: boolean };
  extras: BookExtras;
}

// A blank line starts a new paragraph, as in the scenes.
const paragraphs = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeXml(paragraph)}</p>`)
    .join("\n");

function titlePage(book: BookDetails): Page {
  const subtitle = book.subtitle ? `<p class="title-page">${escapeXml(book.subtitle)}</p>` : "";
  const author = book.author ? `<p class="title-page">${escapeXml(book.author)}</p>` : "";
  return {
    id: "title",
    title: book.title,
    body: `<h1 class="title-page">${escapeXml(book.title)}</h1>${subtitle}${author}`,
  };
}

function copyrightPage({ book, modified, language }: FrontInput): Page {
  const words = bookWords(language);
  const owner = escapeXml(book.author || book.title);
  return {
    id: "copyright",
    title: words.copyright,
    body: `<p class="copyright">© ${modified.getUTCFullYear()} ${owner}</p>\n<p class="copyright">${words.rights}</p>`,
  };
}

/** The cover, title page, copyright page and dedication, in that order. */
export function frontPages(input: FrontInput): Page[] {
  const { book, parts } = input;
  const words = bookWords(input.language);
  const pages: Page[] = [
    {
      id: "cover",
      title: book.title,
      body: `<div class="cover"><img src="../${input.coverName}" alt="${words.cover}" /></div>`,
    },
  ];
  if (parts.hasTitlePage) pages.push(titlePage(book));
  if (parts.hasCopyrightPage) pages.push(copyrightPage(input));
  if (input.extras.dedication) {
    const body = `<p class="dedication">${escapeXml(input.extras.dedication)}</p>`;
    pages.push({ id: "dedication", title: words.dedication, body });
  }
  return pages;
}

/** Thanks and about the author close the book, and are listed in the contents. */
export function backPages(extras: BookExtras, language: string): Page[] {
  const words = bookWords(language);
  const parts: [string, string, string | undefined][] = [
    ["thanks", words.thanks, extras.thanks],
    ["about", words.aboutAuthor, extras.about],
  ];
  return parts.flatMap(([id, title, text]) =>
    text?.trim()
      ? [{ id, title, tocLabel: title, body: `<h1>${escapeXml(title)}</h1>\n${paragraphs(text)}` }]
      : [],
  );
}
