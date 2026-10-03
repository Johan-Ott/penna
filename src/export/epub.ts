import JSZip from "jszip";
import type { Node } from "prosemirror-model";
import { romanNumeral } from "../project/treeLabels.js";
import type { BookDetails, OutlineItem, Typography } from "./book.js";
import { epubCover } from "./epubCover.js";
import { escapeXml, sceneXhtml, xhtmlPage } from "./xhtml.js";

export interface EpubInput {
  book: BookDetails;
  outline: OutlineItem[];
  scenes: Map<string, Node>;
  typography: Typography;
  /** Stays the same between exports of a book, so readers know it is the same book. */
  identifier: string;
  modified: Date;
  parts: { hasTitlePage: boolean; hasCopyrightPage: boolean; hasContents: boolean };
  /** The writer's own picture; without one the book gets a typographic cover. */
  cover?: { type: "jpeg" | "png"; bytes: Uint8Array };
}

// The cover file in the book: the writer's picture, or the typographic SVG.
function coverFile({ cover, book }: EpubInput) {
  if (!cover) return { name: "cover.svg", mediaType: "image/svg+xml", content: epubCover(book) };
  const name = cover.type === "jpeg" ? "cover.jpg" : "cover.png";
  return { name, mediaType: `image/${cover.type}`, content: cover.bytes };
}

/** One XHTML file in the book; `tocLabel` puts it in the table of contents. */
interface Page {
  id: string;
  title: string;
  body: string;
  tocLabel?: string;
}

const LANGUAGE = "sv";
// Items in the package document go on lines of their own, indented under their parent.
const LIST_SEPARATOR = "\n    ";

const STYLE = `body { font-family: serif; line-height: 1.5; margin: 0 5%; }
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
.cover { margin: 0; padding: 0; text-align: center; }
.cover img { height: 100%; max-width: 100%; }`;

function heading(item: Extract<OutlineItem, { kind: "part" | "chapter" }>) {
  const label =
    item.kind === "part" ? `Del ${romanNumeral(item.number)}` : `Kapitel ${item.number}`;
  const tocLabel = item.title ? `${label}. ${item.title}` : label;
  const title = item.title ? `<br />${escapeXml(item.title)}` : "";
  return { label, tocLabel, html: `<h1><span class="label">${label}</span>${title}</h1>` };
}

// A part or chapter starts a new file; scenes before the first chapter open the book.
function textPages({ outline, scenes, typography, book }: EpubInput): Page[] {
  const pages: Page[] = [];
  let current: Page | null = null;
  let previous: OutlineItem["kind"] | null = null;
  for (const item of outline) {
    if (item.kind !== "scene") {
      const { label, tocLabel, html } = heading(item);
      current = { id: `${item.kind}-${item.number}`, title: label, body: html, tocLabel };
      pages.push(current);
    } else {
      if (!current) pages.push((current = { id: "opening", title: book.title, body: "" }));
      if (previous === "scene") current.body += '\n<hr class="scene-break" />';
      const doc = scenes.get(item.id);
      if (doc) current.body += `\n${sceneXhtml(doc, typography)}`;
    }
    previous = item.kind;
  }
  return pages;
}

function frontPages(input: EpubInput): Page[] {
  const { book, parts, modified } = input;
  const pages: Page[] = [
    {
      id: "cover",
      title: book.title,
      body: `<div class="cover"><img src="../${coverFile(input).name}" alt="Omslag" /></div>`,
    },
  ];
  if (parts.hasTitlePage) {
    const subtitle = book.subtitle ? `<p class="title-page">${escapeXml(book.subtitle)}</p>` : "";
    const author = book.author ? `<p class="title-page">${escapeXml(book.author)}</p>` : "";
    pages.push({
      id: "title",
      title: book.title,
      body: `<h1 class="title-page">${escapeXml(book.title)}</h1>${subtitle}${author}`,
    });
  }
  if (parts.hasCopyrightPage) {
    const owner = escapeXml(book.author || book.title);
    pages.push({
      id: "copyright",
      title: "Upphovsrätt",
      body: `<p class="copyright">© ${modified.getUTCFullYear()} ${owner}</p>\n<p class="copyright">Alla rättigheter förbehållna.</p>`,
    });
  }
  return pages;
}

function navPage(pages: Page[]) {
  const items = pages
    .filter((page) => page.tocLabel)
    .map((page) => `<li><a href="text/${page.id}.xhtml">${escapeXml(page.tocLabel ?? "")}</a></li>`)
    .join("\n");
  const body = `<nav epub:type="toc" id="toc">\n<h1>Innehåll</h1>\n<ol>\n${items}\n</ol>\n</nav>`;
  return xhtmlPage("Innehåll", body, LANGUAGE).replace('href="../style.css"', 'href="style.css"');
}

function metadata({ book, identifier, modified }: EpubInput) {
  const stamp = `${modified.toISOString().slice(0, 19)}Z`;
  const creator = book.author
    ? `
    <dc:creator>${escapeXml(book.author)}</dc:creator>`
    : "";
  return `  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">${escapeXml(identifier)}</dc:identifier>
    <dc:title>${escapeXml(book.title)}</dc:title>${creator}
    <dc:language>${LANGUAGE}</dc:language>
    <meta property="dcterms:modified">${stamp}</meta>
  </metadata>`;
}

// The contents page is always in the manifest, as EPUB requires, but read only when chosen.
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
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id" xml:lang="${LANGUAGE}">
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

/** The book as EPUB 3, built whole in memory. The mimetype goes first and uncompressed. */
export async function buildEpub(input: EpubInput): Promise<Uint8Array> {
  const front = frontPages(input);
  const text = textPages(input);
  const zip = new JSZip();
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
  zip.file("META-INF/container.xml", CONTAINER);
  zip.file("OEBPS/content.opf", packageDocument(input, front, text));
  zip.file("OEBPS/nav.xhtml", navPage(text));
  zip.file("OEBPS/style.css", STYLE);
  const cover = coverFile(input);
  zip.file(`OEBPS/${cover.name}`, cover.content);
  for (const page of [...front, ...text]) {
    zip.file(`OEBPS/text/${page.id}.xhtml`, xhtmlPage(page.title, page.body, LANGUAGE));
  }
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
