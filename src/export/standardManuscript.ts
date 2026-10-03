import {
  AlignmentType,
  Document,
  Header,
  Packer,
  PageNumber,
  Paragraph,
  TextRun,
  type ParagraphChild,
} from "docx";
import type { Node } from "prosemirror-model";
import { romanNumeral } from "../project/treeLabels.js";
import { quoteConverter, type BookDetails, type OutlineItem, type Typography } from "./book.js";

interface ManuscriptInput {
  book: BookDetails;
  outline: OutlineItem[];
  scenes: Map<string, Node>;
  typography: Typography;
  hasTitlePage: boolean;
}

// The standard manuscript: Times New Roman 12 pt, double spacing, 2.5 cm margins, 1.27 cm indent.
const FONT = "Times New Roman";
const HALF_POINTS = 24;
const DOUBLE_SPACING = 480;
const MARGIN = 1418;
const INDENT = 720;
// Parts and chapters start a third of the way down a new page.
const HEADING_DROP = 3600;
const SCENE_BREAK = "* * *";

function runs(paragraph: Node, convert: (text: string) => string): ParagraphChild[] {
  const children: ParagraphChild[] = [];
  paragraph.forEach((child) => {
    if (child.type.name === "lineBreak") return void children.push(new TextRun({ break: 1 }));
    const marks = new Set(child.marks.map((mark) => mark.type.name));
    children.push(
      new TextRun({
        text: convert(child.text ?? ""),
        italics: marks.has("italic"),
        bold: marks.has("bold"),
      }),
    );
  });
  return children;
}

const centered = (text: string, extra: object = {}) =>
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun(text)], ...extra });

// Letters, quotes, poems and messages stand indented as a block, without first-line indent.
function paragraphIndent(isFirst: boolean, isInStyle: boolean) {
  if (isInStyle) return { left: INDENT };
  return { firstLine: isFirst ? 0 : INDENT };
}

function blockParagraphs(
  block: Node,
  place: { isFirst: boolean; isInStyle: boolean },
  typography: Typography,
): Paragraph[] {
  const name = block.type.name;
  if (name === "sceneBreak") return [centered(SCENE_BREAK)];
  if (name === "rawBlock") return [new Paragraph(String(block.attrs["source"]))];
  if (name === "styleBlock") {
    const inner: Paragraph[] = [];
    block.forEach((child) =>
      inner.push(...blockParagraphs(child, { isFirst: true, isInStyle: true }, typography)),
    );
    return inner;
  }
  const children = runs(block, quoteConverter(typography));
  return [new Paragraph({ children, indent: paragraphIndent(place.isFirst, place.isInStyle) })];
}

/** A scene's blocks; the first paragraph, and the one after a scene break, are not indented. */
function sceneParagraphs(doc: Node, typography: Typography): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  let isFirst = true;
  doc.forEach((block) => {
    paragraphs.push(...blockParagraphs(block, { isFirst, isInStyle: false }, typography));
    isFirst = block.type.name === "sceneBreak";
  });
  return paragraphs;
}

function headingParagraphs(item: Extract<OutlineItem, { kind: "part" | "chapter" }>) {
  const label =
    item.kind === "part" ? `Del ${romanNumeral(item.number)}` : `Kapitel ${item.number}`;
  return [
    centered(label, { pageBreakBefore: true, spacing: { before: HEADING_DROP } }),
    ...(item.title ? [centered(item.title)] : []),
  ];
}

function bodyParagraphs({ outline, scenes, typography }: ManuscriptInput): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  let previous: OutlineItem["kind"] | null = null;
  for (const item of outline) {
    if (item.kind !== "scene") paragraphs.push(...headingParagraphs(item));
    else {
      const doc = scenes.get(item.id);
      if (previous === "scene") paragraphs.push(centered(SCENE_BREAK));
      if (doc) paragraphs.push(...sceneParagraphs(doc, typography));
    }
    previous = item.kind;
  }
  return paragraphs;
}

// "ca 48 200 ord": a manuscript's length is given rounded, as publishers expect.
const roundedWords = (words: number) =>
  `ca ${(Math.round(words / 100) * 100).toLocaleString("sv-SE")} ord`;

function titlePage(book: BookDetails): Paragraph[] {
  return [
    new Paragraph(book.author),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun(roundedWords(book.words))],
    }),
    centered(book.title.toLocaleUpperCase("sv-SE"), { spacing: { before: HEADING_DROP } }),
    ...(book.subtitle ? [centered(book.subtitle)] : []),
    ...(book.author ? [centered(`av ${book.author}`)] : []),
  ];
}

// "Berg / Vintervägen / 12" at the top right of every page after the title page.
function pageHeader(book: BookDetails) {
  const surname = book.author.trim().split(/\s+/).pop() ?? "";
  const text = [surname, book.title].filter((part) => part !== "").join(" / ");
  return new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun(`${text} / `), new TextRun({ children: [PageNumber.CURRENT] })],
      }),
    ],
  });
}

/** The book as a standard manuscript (DOCX), built whole in memory before anything is saved. */
export async function standardManuscript(input: ManuscriptInput): Promise<Uint8Array> {
  const page = { margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN } };
  const document = new Document({
    creator: input.book.author,
    title: input.book.title,
    styles: {
      default: {
        document: {
          run: { font: FONT, size: HALF_POINTS },
          paragraph: { spacing: { line: DOUBLE_SPACING } },
        },
      },
    },
    sections: [
      ...(input.hasTitlePage ? [{ properties: { page }, children: titlePage(input.book) }] : []),
      {
        properties: { page: { ...page, pageNumbers: { start: 1 } } },
        headers: { default: pageHeader(input.book) },
        children: bodyParagraphs(input),
      },
    ],
  });
  return new Uint8Array(await Packer.toArrayBuffer(document));
}
