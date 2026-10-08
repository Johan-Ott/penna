import { describe, expect, it } from "vitest";
import { positionAfter, textBefore } from "../src/editor/documentText";
import { sentenceBefore } from "../src/editor/focus";
import { parseMarkdown } from "../src/manuscript/parseMarkdown";

describe("sentenceBefore", () => {
  const doc = parseMarkdown("Hon satte sig. Utanför låg isen.\n\n– Vet du vem det är från?\n\n");

  it("gives the sentence up to the cursor", () => {
    const end = "Hon satte sig. Utanför låg isen.".length + 1;

    expect(sentenceBefore(doc, end)).toBe("Utanför låg isen.");
    expect(sentenceBefore(doc, end - 6)).toBe("Utanför låg");
  });

  it("gives the last sentence of the paragraph before when the cursor starts a new one", () => {
    expect(sentenceBefore(doc, doc.content.size - 1)).toBe("– Vet du vem det är från?");
  });
});

describe("positionAfter", () => {
  it("finds the place again by the words before it, though the position moved", () => {
    const doc = parseMarkdown("Hon log. Sedan gick hon ut.\n");
    const place = 1 + "Hon log. Sedan gick hon".length;

    const found = positionAfter(doc, textBefore(doc, place), place + 2);

    expect(sentenceBefore(doc, found)).toBe("Sedan gick hon");
  });
});
