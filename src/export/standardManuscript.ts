import {
  AlignmentType,
  Bookmark,
  Document,
  Header,
  Packer,
  PageNumber,
  Paragraph,
  TextRun,
  type IParagraphOptions,
  type ParagraphChild,
} from "docx";
import type { Node } from "prosemirror-model";
import type { BookDetails, OutlineItem, Typography } from "./book.js";
import { runs, type TextSettings, type WordNotes } from "./wordRuns.js";
import { bookWords, headingLabel, roundedWords, titleBesideLabel } from "./bookWords.js";
import { sceneEndMark, sceneStartMark } from "./sceneMarks.js";

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

// Paragraphs are kept as options until the scene is done, so its marks can go inside them.
type ParagraphOptions = { children: ParagraphChild[] } & Omit<IParagraphOptions, "children">;

const centeredOptions = (text: string): ParagraphOptions => ({
  alignment: AlignmentType.CENTER,
  children: [new TextRun(text)],
});

const centered = (text: string, extra: object = {}) =>
  new Paragraph({ ...centeredOptions(text), ...extra });

const LISTS = new Set(["punktlista", "numrerad"]);

// A list's paragraph starts with its bullet or number, as typed, with a tab to the hanging edge.
const listMark = (style: string, index: number) =>
  LISTS.has(style) ? [new TextRun(style === "punktlista" ? "•\t" : `${index + 1}.\t`)] : [];

const RIGHT = { alignment: AlignmentType.RIGHT };
const UNINDENTED = { indent: { firstLine: 0 } };
const HANGING = { indent: { left: INDENT, hanging: INDENT / 2 } };

// Centrerat, the right-hand styles, Utan indrag and Kapitäler only set the line; a list hangs;
// the others are inset. A manuscript for agents keeps no small capitals.
const LAYOUTS: Record<string, object> = {
  centrerat: { alignment: AlignmentType.CENTER },
  hoger: RIGHT,
  "meddelande-ut": RIGHT,
  motto: RIGHT,
  "utan-indrag": UNINDENTED,
  kapitaler: UNINDENTED,
  punktlista: HANGING,
  numrerad: HANGING,
};

function paragraphLayout(isFirst: boolean, style: string | null) {
  if (!style) return { indent: { firstLine: isFirst ? 0 : INDENT } };
  return LAYOUTS[style] ?? { indent: { left: INDENT } };
}

function blockParagraphs(
  block: Node,
  place: { isFirst: boolean; style: string | null },
  settings: TextSettings,
): ParagraphOptions[] {
  const name = block.type.name;
  if (name === "sceneBreak") return [centeredOptions(SCENE_BREAK)];
  if (name === "rawBlock") return [{ children: [new TextRun(String(block.attrs["source"]))] }];
  // A manuscript for agents and editors carries no pictures; it says where one goes.
  if (name === "picture") {
    return [centeredOptions(`[${block.attrs["caption"] || block.attrs["name"]}]`)];
  }
  if (name === "styleBlock") {
    const inner: ParagraphOptions[] = [];
    const style = String(block.attrs["style"]);
    block.forEach((child, _offset, index) =>
      inner.push(
        ...blockParagraphs(child, { isFirst: true, style }, settings).map((options) => ({
          ...options,
          children: [...listMark(style, index), ...(options.children ?? [])],
        })),
      ),
    );
    return inner;
  }
  const children = runs(block, settings);
  return [{ children, ...paragraphLayout(place.isFirst, place.style) }];
}

// Invisible, at the start of the scene's first paragraph and the end of its last.
function withSceneMarks(paragraphs: ParagraphOptions[], sceneId: string): Paragraph[] {
  const last = paragraphs.length - 1;
  return paragraphs.map((options, index) => {
    const start = index === 0 ? [new Bookmark({ id: sceneStartMark(sceneId), children: [] })] : [];
    const end = index === last ? [new Bookmark({ id: sceneEndMark(sceneId), children: [] })] : [];
    return new Paragraph({ ...options, children: [...start, ...options.children, ...end] });
  });
}

/** The first paragraph, and the one after a scene break, are not indented. */
function sceneParagraphs(doc: Node, settings: TextSettings): ParagraphOptions[] {
  const paragraphs: ParagraphOptions[] = [];
  let isFirst = true;
  doc.forEach((block) => {
    paragraphs.push(...blockParagraphs(block, { isFirst, style: null }, settings));
    isFirst = block.type.name === "sceneBreak";
  });
  return paragraphs;
}

function headingParagraphs(
  item: Extract<OutlineItem, { kind: "part" | "chapter" }>,
  language: string,
) {
  const label = headingLabel(item, language);
  const title = titleBesideLabel(item.title, label);
  return [
    centered(label, { pageBreakBefore: true, spacing: { before: HEADING_DROP } }),
    ...(title ? [centered(title)] : []),
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
      if (doc)
        paragraphs.push(...withSceneMarks(sceneParagraphs(doc, { typography, notes }), item.id));
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
