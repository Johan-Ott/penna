import { describe, expect, it } from "vitest";
import { commentDecorations } from "../src/editor/commentMarks";
import { documentText } from "../src/editor/documentText";
import { parseMarkdown } from "../src/manuscript/parseMarkdown";
import { anchorAt } from "../src/project/comments";

const doc = parseMarkdown("Brevet låg där.\n\n*Kuvertet* var gult av ålder.\n");

describe("documentText", () => {
  it("turns document positions into text offsets and back", () => {
    const { text, toDoc, fromDoc } = documentText(doc);
    const from = text.indexOf("Kuvertet");

    expect(doc.textBetween(toDoc(from), toDoc(from + 8))).toBe("Kuvertet");
    expect(fromDoc(toDoc(from))).toBe(from);
  });
});

describe("commentDecorations", () => {
  it("marks each placed comment's quote in the document", () => {
    const { text } = documentText(doc);
    const anchor = anchorAt(text, text.indexOf("Kuvertet"), text.indexOf(" av"));

    const marked = commentDecorations(doc, [{ id: "k1x", anchor }])
      .find()
      .map((decoration) => doc.textBetween(decoration.from, decoration.to));

    expect(marked).toEqual(["Kuvertet var gult"]);
  });
});
