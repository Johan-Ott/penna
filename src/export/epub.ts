import JSZip from "jszip";
import type { Node } from "prosemirror-model";
import type { BookDetails, OutlineItem, Typography } from "./book.js";
import { backPages, frontPages, type BookExtras, type Page } from "./bookParts.js";
import { bookWords, headingLabel } from "./bookWords.js";
import { epubCover } from "./epubCover.js";
import { escapeXml, sceneXhtml, xhtmlPage } from "./xhtml.js";

export type { BookExtras };

export interface EpubInput {
  book: BookDetails;
  outline: OutlineItem[];
  scenes: Map<string, Node>;
  typography: Typography;
  /** A language tag such as "sv-SE". */
  language: string;
  /** The same between exports, so readers know it is the same book. */
  identifier: string;
  modified: Date;
  parts: { hasTitlePage: boolean; hasCopyrightPage: boolean; hasContents: boolean };
  extras: BookExtras;
  /** Without a picture the book gets a typographic cover. */
  cover?: { type: "jpeg" | "png"; bytes: Uint8Array };
}

function coverFile({ cover, book }: EpubInput) {
  if (!cover) return { name: "cover.svg", mediaType: "image/svg+xml", content: epubCover(book) };
  const name = cover.type === "jpeg" ? "cover.jpg" : "cover.png";
  return { name, mediaType: `image/${cover.type}`, content: cover.bytes };
}

const LIST_SEPARATOR = "\n    ";

export const EBOOK_STYLE = `body { font-family: serif; line-height: 1.5; margin: 0 5%; }
p { margin: 0; text-indent: 1.5em; }
p.first { text-indent: 0; }
h1 { text-align: center; font-weight: normal; margin: 3em 0 2em; }
h1 .label { display: block; font-size: 0.7em; letter-spacing: 0.1em; text-transform: uppercase; }
hr.scene-break { border: 0; text-align: center; margin: 1.5em 0; }
hr.scene-break::after { content: "* * *"; }
div.brev, div.citat, div.dikt, div.meddelande { margin: 1em 2em; }
div.brev p, div.citat p, div.dikt p, div.meddelande p { text-indent: 0; }
.title-page, .copyright { text-align: center; text-indent: 0; }
.title-page h1 { font-size: 2em; margin-top: 30%; }
.dedication { text-align: center; text-indent: 0; font-style: italic; margin-top: 30%; }
.cover { margin: 0; padding: 0; text-align: center; }
.cover img { height: 100%; max-width: 100%; }`;

function heading(item: Extract<OutlineItem, { kind: "part" | "chapter" }>, language: string) {
  const label = headingLabel(item, language);
  const tocLabel = item.title ? `${label}. ${item.title}` : label;
  const title = item.title ? `<br />${escapeXml(item.title)}` : "";
  return { label, tocLabel, html: `<h1><span class="label">${label}</span>${title}</h1>` };
}

function textPages({ outline, scenes, typography, book, language }: EpubInput): Page[] {
  const pages: Page[] = [];
  let current: Page | null = null;
  let previous: OutlineItem["kind"] | null = null;
  for (const item of outline) {
    if (item.kind !== "scene") {
      const { label, tocLabel, html } = heading(item, language);
      current = { id: `${item.kind}-${item.number}`, title: label, body: html, tocLabel };
      pages.push(current);
    } else {
      if (!current) pages.push((current = { id: "opening", title: book.title, body: "" }));
      if (previous === "scene") current.body += '\n<hr class="scene-break" />';
      const doc = scenes.get(item.id);
      if (doc) current.body += `\n${sceneXhtml(doc, typography, item.id)}`;
    }
    previous = item.kind;
  }
  return pages;
}

function navPage(pages: Page[], language: string) {
  const items = pages
    .filter((page) => page.tocLabel)
    .map((page) => `<li><a href="text/${page.id}.xhtml">${escapeXml(page.tocLabel ?? "")}</a></li>`)
    .join("\n");
  const { contents } = bookWords(language);
  const body = `<nav epub:type="toc" id="toc">\n<h1>${contents}</h1>\n<ol>\n${items}\n</ol>\n</nav>`;
  return xhtmlPage(contents, body, language).replace('href="../style.css"', 'href="style.css"');
}

function metadata({ book, identifier, modified, language }: EpubInput) {
  const stamp = `${modified.toISOString().slice(0, 19)}Z`;
  const creator = book.author
    ? `
    <dc:creator>${escapeXml(book.author)}</dc:creator>`
    : "";
  return `  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">${escapeXml(identifier)}</dc:identifier>
    <dc:title>${escapeXml(book.title)}</dc:title>${creator}
    <dc:language>${language}</dc:language>
    <meta property="dcterms:modified">${stamp}</meta>
  </metadata>`;
}

// EPUB requires the contents page in the manifest; it is read only when chosen.
function spine(front: Page[], text: Page[], hasContents: boolean) {
  const ids = [
    ...front.map((page) => page.id),
    ...(hasContents ? ["nav"] : []),
    ...text.map((page) => page.id),
  ];
  return ids.map((id) => `<itemref idref="${id}" />`).join(LIST_SEPARATOR);
}

function packageDocument(input: EpubInput, front: Page[], text: Page[]) {
  const cover = coverFile(input);
  const pageItems = [...front, ...text]
    .map(
      (page) =>
        `<item id="${page.id}" href="text/${page.id}.xhtml" media-type="application/xhtml+xml" />`,
    )
    .join(LIST_SEPARATOR);
  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id" xml:lang="${input.language}">
${metadata(input)}
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav" />
    <item id="style" href="style.css" media-type="text/css" />
    <item id="cover-image" href="${cover.name}" media-type="${cover.mediaType}" properties="cover-image" />
    ${pageItems}
  </manifest>
  <spine>
    ${spine(front, text, input.parts.hasContents)}
  </spine>
</package>
`;
}

const CONTAINER = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml" />
  </rootfiles>
</container>
`;

/** The mimetype goes first and uncompressed, as EPUB requires. */
export async function buildEpub(input: EpubInput): Promise<Uint8Array> {
  const front = frontPages({ ...input, coverName: coverFile(input).name });
  const text = [...textPages(input), ...backPages(input.extras, input.language)];
  const zip = new JSZip();
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
  zip.file("META-INF/container.xml", CONTAINER);
  zip.file("OEBPS/content.opf", packageDocument(input, front, text));
  zip.file("OEBPS/nav.xhtml", navPage(text, input.language));
  zip.file("OEBPS/style.css", EBOOK_STYLE);
  const cover = coverFile(input);
  zip.file(`OEBPS/${cover.name}`, cover.content);
  for (const page of [...front, ...text]) {
    zip.file(`OEBPS/text/${page.id}.xhtml`, xhtmlPage(page.title, page.body, input.language));
  }
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
