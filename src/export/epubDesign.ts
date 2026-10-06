import type { OutlineItem } from "./book.js";
import { BREAK_PICTURE, DEFAULT_DESIGN, type BookDesign } from "./bookDesign.js";
import { contentsLabel, designedLabel } from "./bookWords.js";
import { imageSize } from "./imageSize.js";
import { openingOf } from "./typstOpening.js";
import { escapeXml } from "./xhtml.js";

/** The book design as far as e-readers follow it: the reader picks the typeface and size. */
export interface EpubDesign {
  design: BookDesign;
  /** The pictures the design and chapters use, by file name. */
  images: Map<string, Uint8Array>;
}

type Opening = Extract<OutlineItem, { kind: "part" | "chapter" }>;

const LONG_DASH = String.fromCharCode(0x2014);
const TITLE_CASES: Record<BookDesign["titleCase"], string> = {
  vanlig: "",
  kapitaler: "h1 .title { font-variant: small-caps; }",
  versaler: "h1 .title { text-transform: uppercase; letter-spacing: 0.05em; }",
};

const picture = (name: string, className: string) =>
  `<div class="${className}"><img src="../bilder/${escapeXml(name)}" alt="" /></div>`;

const has = ({ images }: EpubDesign, name: string | undefined): name is string =>
  Boolean(name && images.has(name));

export function designStyle({ design }: EpubDesign) {
  const mark = design.sceneBreak === BREAK_PICTURE ? DEFAULT_DESIGN.sceneBreak : design.sceneBreak;
  return [
    TITLE_CASES[design.titleCase],
    design.leadIn
      ? "h1 + p::first-line, .epigraph + p::first-line { font-variant: small-caps; }"
      : "",
    `hr.scene-break::after { content: "${mark.replace(/["\\]/g, "\\$&")}"; }`,
  ]
    .filter(Boolean)
    .join("\n");
}

function epigraph(item: Opening) {
  if (!item.epigraph) return "";
  const source = item.epigraphBy
    ? `<p class="by">${LONG_DASH} ${escapeXml(item.epigraphBy)}</p>`
    : "";
  return `\n<blockquote class="epigraph"><p>${escapeXml(item.epigraph)}</p>${source}</blockquote>`;
}

// An e-book has no fixed page, so the template's pictures come above the heading, top first.
function openingPictures(item: Opening, look: EpubDesign) {
  if (item.kind === "part") return { align: "mitten", html: "" };
  const { template, areas } = openingOf(look.design, item, look.images);
  const ordered = [...areas].sort((first, second) => first.y - second.y);
  const html = ordered.map((shown) => picture(shown.picture, "opening-picture")).join("");
  return { align: template.headingAlign, html };
}

/** The chapter's opening: its pictures, label, title, subtitle and epigraph. */
export function openingHtml(item: Opening, language: string, look: EpubDesign) {
  const label = designedLabel(item, language, look.design.chapterLabel);
  const parts = [
    label ? `<span class="label">${escapeXml(label)}</span>` : "",
    item.title ? `<span class="title">${escapeXml(item.title)}</span>` : "",
    item.subtitle ? `<span class="subtitle">${escapeXml(item.subtitle)}</span>` : "",
  ].filter(Boolean);
  const heading = `<h1>${parts.join("<br />") || escapeXml(contentsLabel(item, language))}</h1>`;
  const pictures = openingPictures(item, look);
  return `<div class="opening opening-${pictures.align}">${pictures.html}${heading}${epigraph(item)}</div>`;
}

/** With a picture as scene break, each break shows it instead of the marks. */
export function withSceneBreaks(body: string, look: EpubDesign) {
  const { design } = look;
  if (design.sceneBreak !== BREAK_PICTURE || !has(look, design.breakPicture)) return body;
  return body.replaceAll('<hr class="scene-break" />', picture(design.breakPicture, "scene-break"));
}

/** Each picture's place in the book and its manifest line. */
export function pictureFiles({ images }: EpubDesign) {
  return [...images].flatMap(([name, bytes], index) => {
    const size = imageSize(bytes);
    if (!size) return [];
    const href = `bilder/${name}`;
    const item = `<item id="bild-${index}" href="${escapeXml(href)}" media-type="image/${size.type}" />`;
    return [{ path: `OEBPS/${href}`, bytes, item }];
  });
}
