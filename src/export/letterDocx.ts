import { Document, Packer, Paragraph, TextRun } from "docx";

// A synopsis or a cover letter as a Word file: the manuscript's typeface, one and a half spacing.
const FONT = "Times New Roman";
const HALF_POINTS = 24;
const ONE_AND_A_HALF = 360;
const MARGIN = 1418;
const AFTER_PARAGRAPH = 200;

export interface LetterInput {
  /** "Synopsis · Vintervägen", in bold at the top; empty for a letter, which has none. */
  heading: string;
  text: string;
  author: string;
  language: string;
}

export async function letterDocx(input: LetterInput): Promise<Uint8Array> {
  const paragraphs = input.text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => new Paragraph({ children: [new TextRun(paragraph)] }));
  const heading = input.heading
    ? [new Paragraph({ children: [new TextRun({ text: input.heading, bold: true })] })]
    : [];
  const document = new Document({
    creator: input.author,
    styles: {
      default: {
        document: {
          run: { font: FONT, size: HALF_POINTS, language: { value: input.language } },
          paragraph: { spacing: { line: ONE_AND_A_HALF, after: AFTER_PARAGRAPH } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: { margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN } },
        },
        children: [...heading, ...paragraphs],
      },
    ],
  });
  return new Uint8Array(await Packer.toArrayBuffer(document));
}
