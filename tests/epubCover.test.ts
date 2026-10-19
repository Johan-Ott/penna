import { describe, expect, it } from "vitest";
import { epubCover } from "../src/export/epubCover";
import type { BookDetails } from "../src/export/book";

const book = (subtitle: string) =>
  ({ title: "Vintervägen", subtitle, author: "Anna Berg" }) as BookDetails;

describe("epubCover", () => {
  it("sets a long subtitle over several lines, so none runs past the edge", () => {
    const svg = epubCover(book("En roman om en vinter som kanske aldrig tar slut"));

    expect(svg).toContain('y="260"');
    expect(svg).toContain('y="332"');
  });
});
