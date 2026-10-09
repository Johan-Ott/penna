import type { BookDetails } from "./book.js";
import { bookWords } from "./bookWords.js";
import { escapeXml } from "./xhtml.js";

/** `tocLabel` puts the page in the table of contents. */
export interface Page {
  id: string;
  title: string;
  body: string;
  tocLabel?: string;
}

/** A part is left out when it has no text. */
export interface BookExtras {
  dedication?: string;
  thanks?: string;
  about?: string;
  /** The writer's other books, one title to a line. */
  alsoBy?: string;
  newsletter?: string;
  /** "Name https://…", one store to a line; only an e-book has them, where they can be clicked. */
  stores?: string;
  /** The opening of another book, as plain paragraphs. */
  excerpt?: { title: string; text: string };
}

export interface BackText {
  id: string;
  title: string;
  text: string;
}

const linesAsParagraphs = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n\n");

/** The pages after the story, in the order books have them: thanks and the writer, then what next. */
export function backTexts(extras: BookExtras, language: string, hasLinks: boolean): BackText[] {
  const words = bookWords(language);
  const parts: [string, string, string | undefined][] = [
    ["thanks", words.thanks, extras.thanks],
    ["about", words.aboutAuthor, extras.about],
    ["also-by", words.alsoBy, extras.alsoBy && linesAsParagraphs(extras.alsoBy)],
    ["newsletter", words.keepInTouch, extras.newsletter],
    ["stores", words.stores, hasLinks ? extras.stores : undefined],
    ["excerpt", words.excerptFrom(extras.excerpt?.title ?? ""), extras.excerpt?.text],
  ];
  return parts.flatMap(([id, title, text]) => (text?.trim() ? [{ id, title, text }] : []));
}

interface FrontInput {
  book: BookDetails;
  language: string;
  modified: Date;
  coverName: string;
  parts: { hasTitlePage: boolean; hasCopyrightPage: boolean };
  extras: BookExtras;
}

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

// A store line is its name and then its address: "Adlibris https://…".
function storeLinks(text: string) {
  const links = text.split("\n").flatMap((line) => {
    const found = /^(.*?)\s*(https?:\/\/\S+)$/.exec(line.trim());
    if (!found) return [];
    const [, name = "", address = ""] = found;
    return [`<p><a href="${escapeXml(address)}">${escapeXml(name || address)}</a></p>`];
  });
  return links.join("\n");
}

export function backPages(extras: BookExtras, language: string): Page[] {
  return backTexts(extras, language, true).map(({ id, title, text }) => {
    const body = id === "stores" ? storeLinks(text) : paragraphs(text);
    return { id, title, tocLabel: title, body: `<h1>${escapeXml(title)}</h1>\n${body}` };
  });
}
