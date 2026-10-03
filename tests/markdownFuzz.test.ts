import type { Mark, Node } from "prosemirror-model";
import { describe, expect, it } from "vitest";
import { parseMarkdown } from "../src/manuscript/parseMarkdown";
import { manuscriptSchema as schema } from "../src/manuscript/schema";
import { serializeMarkdown } from "../src/manuscript/serializeMarkdown";

const PIECES = ["ord", "Åsa", " ", "*", "_", "\\", "[", "]", "<b>", "`", "#", "- ", "1. ", ":::"];
const MORE_PIECES = ["&amp;", "&", "–", "”", "!", ">", "=", "~", "+", "…", "a_b", "2*3"];
const ALL_PIECES = [...PIECES, ...MORE_PIECES];

function randomSource(seed: number) {
  let state = seed;
  return (below: number) => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state % below;
  };
}

function randomText(random: (below: number) => number): string {
  const length = 1 + random(6);
  return Array.from({ length }, () => ALL_PIECES[random(ALL_PIECES.length)]).join("");
}

function randomMarks(random: (below: number) => number): Mark[] {
  const marks: Mark[] = [];
  if (random(3) === 0) marks.push(schema.mark("italic"));
  if (random(3) === 0) marks.push(schema.mark("bold"));
  return marks;
}

function randomParagraph(random: (below: number) => number): Node {
  const content: Node[] = [];
  const pieces = 1 + random(5);
  for (let index = 0; index < pieces; index++) {
    if (index > 0 && random(5) === 0) content.push(schema.node("lineBreak"));
    content.push(schema.text(randomText(random), randomMarks(random)));
  }
  return schema.node("paragraph", null, content);
}

// Spaces at the start or end of a line, and paragraphs with no words, are not written to the
// file, so the comparison leaves them out.
const visibleText = (doc: Node) =>
  doc.children
    .map((block) =>
      block.children
        .map((child) => (child.isText ? child.text : "\n"))
        .join("")
        .split("\n")
        .map((line) => line.trim())
        .join("\n"),
    )
    .filter((text) => text.trim() !== "");

describe("Markdown round trip for typed text", () => {
  it.each([42, 7, 2026, 31337])(
    "keeps the text and saves the same file twice (seed %i)",
    (seed) => {
      const random = randomSource(seed);

      for (let round = 0; round < 500; round++) {
        const doc = schema.node("doc", null, [randomParagraph(random), randomParagraph(random)]);

        const once = serializeMarkdown(doc);
        const reread = parseMarkdown(once);
        const twice = serializeMarkdown(reread);

        expect(visibleText(reread), JSON.stringify(once)).toEqual(visibleText(doc));
        expect(twice, JSON.stringify(once)).toBe(once);
      }
    },
  );
});
