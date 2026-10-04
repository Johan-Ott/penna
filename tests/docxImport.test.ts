import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { describe, expect, it } from "vitest";
import { docxToMarkdown, htmlToMarkdown } from "../src/import/docxImport";

describe("htmlToMarkdown", () => {
  it("keeps headings, paragraphs, italic and bold, and escapes what Markdown would misread", () => {
    const html =
      "<h1>Brevet</h1><p>Hon läste <em>brevet</em> och <strong>log</strong>.</p><p>2 * 3 &amp; mer</p>";

    const markdown = htmlToMarkdown(html);

    expect(markdown).toBe("# Brevet\n\nHon läste *brevet* och **log**.\n\n2 \\* 3 & mer\n");
  });

  it("writes a scene break as one, and drops images and links but keeps their text", () => {
    const html = '<p>***</p><p><img src="data:x" /><a href="https://x">Fyren</a> lyste.</p>';

    const markdown = htmlToMarkdown(html);

    expect(markdown).toBe("***\n\nFyren lyste.\n");
  });
});

describe("docxToMarkdown", () => {
  it("reads a Word file's heading styles and emphasis", async () => {
    const document = new Document({
      sections: [
        {
          children: [
            new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Brevet")] }),
            new Paragraph({
              children: [new TextRun("Hon läste "), new TextRun({ text: "brevet", italics: true })],
            }),
          ],
        },
      ],
    });
    const bytes = new Uint8Array(await Packer.toBuffer(document));

    const markdown = await docxToMarkdown(bytes);

    expect(markdown).toBe("# Brevet\n\nHon läste *brevet*\n");
  });
});
