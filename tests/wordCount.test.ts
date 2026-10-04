import { describe, expect, it } from "vitest";
import { parseMarkdown } from "../src/manuscript/parseMarkdown";
import { countDocumentWords, countWordsBetween } from "../src/manuscript/wordCount";

describe("countWordsBetween", () => {
  it("counts the words of a selection, across paragraphs", () => {
    const doc = parseMarkdown("Brevet låg där.\n\nKuvertet var gult.\n");
    const end = doc.content.size;

    const words = countWordsBetween(doc, 1, end);

    expect(words).toBe(countDocumentWords(doc));
    expect(words).toBe(6);
  });

  it("counts nothing for an empty selection", () => {
    const doc = parseMarkdown("Brevet låg där.\n");

    expect(countWordsBetween(doc, 3, 3)).toBe(0);
  });
});
