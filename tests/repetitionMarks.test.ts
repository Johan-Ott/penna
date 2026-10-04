import { describe, expect, it } from "vitest";
import { repetitionDecorations, sceneRepetitions } from "../src/editor/repetitionMarks";
import { parseMarkdown } from "../src/manuscript/parseMarkdown";

const doc = parseMarkdown(
  "Som om ingenting *hade* hänt.\n\nHon satte sig. Utanför fönstret hade isen lagt sig.\n",
);

describe("repetition marks", () => {
  it("marks a word repeated within the window, across paragraphs and emphasis", () => {
    const marked = repetitionDecorations(doc, 3)
      .find()
      .map((decoration) => doc.textBetween(decoration.from, decoration.to));

    expect(marked).toEqual(["hade", "hade"]);
  });

  it("lists each repeated word once, with how often, for the review panel", () => {
    const found = sceneRepetitions(doc, 3);

    expect(found).toEqual([{ word: "hade", count: 2 }]);
  });
});
