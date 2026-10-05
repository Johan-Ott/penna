import {
  AlignmentType,
  Document,
  FootnoteReferenceRun,
  Header,
  Packer,
  PageNumber,
  Paragraph,
  TextRun,
  type ParagraphChild,
} from "docx";
import type { Node } from "prosemirror-model";
import { quoteConverter, type BookDetails, type OutlineItem, type Typography } from "./book.js";
import { bookWords, headingLabel, roundedWords } from "./bookWords.js";

interface ManuscriptInput {
  book: BookDetails;
  outline: OutlineItem[];
  scenes: Map<string, Node>;
  typography: Typography;
  language: string;
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

// Word numbers footnotes through the whole document, in the order they are added.
interface WordNotes {
  entries: Record<number, { children: Paragraph[] }>;
  count: number;
}

function noteReference(notes: WordNotes, text: string) {
  notes.count += 1;
  notes.entries[notes.count] = { children: [new Paragraph({ children: [new TextRun(text)] })] };
  return new FootnoteReferenceRun(notes.count);
}

interface TextSettings {
  typography: Typography;
  notes: WordNotes;
}

function runs(paragraph: Node, settings: TextSettings): ParagraphChild[] {
  const convert = quoteConverter(settings.typography);
  const children: ParagraphChild[] = [];
  paragraph.forEach((child) => {
    if (child.type.name === "lineBreak") return void children.push(new TextRun({ break: 1 }));
    if (child.type.name === "footnote") {
      return void children.push(
        noteReference(settings.notes, convert(String(child.attrs["text"]))),
      );
    }
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

function paragraphIndent(isFirst: boolean, isInStyle: boolean) {
  if (isInStyle) return { left: INDENT };
  return { firstLine: isFirst ? 0 : INDENT };
}

function blockParagraphs(
  block: Node,
  place: { isFirst: boolean; isInStyle: boolean },
  settings: TextSettings,
): Paragraph[] {
  const name = block.type.name;
  if (name === "sceneBreak") return [centered(SCENE_BREAK)];
  if (name === "rawBlock") return [new Paragraph(String(block.attrs["source"]))];
  if (name === "styleBlock") {
    const inner: Paragraph[] = [];
    block.forEach((child) =>
      inner.push(...blockParagraphs(child, { isFirst: true, isInStyle: true }, settings)),
    );
    return inner;
  }
  const children = runs(block, settings);
  return [new Paragraph({ children, indent: paragraphIndent(place.isFirst, place.isInStyle) })];
}

/** The first paragraph, and the one after a scene break, are not indented. */
function sceneParagraphs(doc: Node, settings: TextSettings): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  let isFirst = true;
  doc.forEach((block) => {
    paragraphs.push(...blockParagraphs(block, { isFirst, isInStyle: false }, settings));
    isFirst = block.type.name === "sceneBreak";
  });
  return paragraphs;
}

function headingParagraphs(
  item: Extract<OutlineItem, { kind: "part" | "chapter" }>,
  language: string,
) {
  const label = headingLabel(item, language);
  return [
    centered(label, { pageBreakBefore: true, spacing: { before: HEADING_DROP } }),
    ...(item.title ? [centered(item.title)] : []),
  ];
}

function bodyParagraphs(input: ManuscriptInput, notes: WordNotes): Paragraph[] {
  const { outline, scenes, typography, language } = input;
  const paragraphs: Paragraph[] = [];
  let previous: OutlineItem["kind"] | null = null;
  for (const item of outline) {
    if (item.kind !== "scene") paragraphs.push(...headingParagraphs(item, language));
    else {
      const doc = scenes.get(item.id);
      if (previous === "scene") paragraphs.push(centered(SCENE_BREAK));
      if (doc) paragraphs.push(...sceneParagraphs(doc, { typography, notes }));
    }
    previous = item.kind;
  }
  return paragraphs;
}

function titlePage(book: BookDetails, language: string): Paragraph[] {
  return [
    new Paragraph(book.author),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun(roundedWords(book.words, language))],
    }),
    centered(book.title.toLocaleUpperCase(language), { spacing: { before: HEADING_DROP } }),
    ...(book.subtitle ? [centered(book.subtitle)] : []),
    ...(book.author ? [centered(bookWords(language).byAuthor(book.author))] : []),
  ];
}

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

/** Built whole in memory before anything is saved. */
export async function standardManuscript(input: ManuscriptInput): Promise<Uint8Array> {
  const page = { margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN } };
  const notes: WordNotes = { entries: {}, count: 0 };
  const body = bodyParagraphs(input, notes);
  const document = new Document({
    footnotes: notes.entries,
    creator: input.book.author,
    title: input.book.title,
    styles: {
      default: {
        document: {
          // Word spellchecks the manuscript in the book's language.
          run: { font: FONT, size: HALF_POINTS, language: { value: input.language } },
          paragraph: { spacing: { line: DOUBLE_SPACING } },
        },
      },
    },
    sections: [
      ...(input.hasTitlePage
        ? [{ properties: { page }, children: titlePage(input.book, input.language) }]
        : []),
      {
        properties: { page: { ...page, pageNumbers: { start: 1 } } },
        headers: { default: pageHeader(input.book) },
        children: body,
      },
    ],
  });
  return new Uint8Array(await Packer.toArrayBuffer(document));
}
