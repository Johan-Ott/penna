import { describe, expect, it } from "vitest";
import { parseMarkdown } from "../src/manuscript/parseMarkdown";
import { plainBook } from "../src/export/plainFormats";
import type { OutlineItem } from "../src/export/book";

const outline: OutlineItem[] = [
  { kind: "chapter", number: 1, title: "Brevet" },
  { kind: "scene", id: "koket" },
  { kind: "scene", id: "isen" },
];
const scenes = new Map([
  ["koket", parseMarkdown("Brevet låg på *köksbordet*.")],
  ["isen", parseMarkdown("Isen bar.")],
]);
const book = { title: "Vintervägen", author: "Elin Berg", outline, scenes };
const asText = (format: "markdown" | "text" | "html") =>
  new TextDecoder().decode(plainBook(book, format, "svensk", "sv"));

describe("plainBook", () => {
  it("writes Markdown with the title, the chapter heading and a break between scenes", () => {
    expect(asText("markdown")).toBe(
      "# Vintervägen\n\n*Elin Berg*\n\n### 1. Brevet\n\nBrevet låg på *köksbordet*.\n\n* * *\n\nIsen bar.\n",
    );
  });

  it("writes plain text without the marks", () => {
    expect(asText("text")).toContain("1. BREVET\n\nBrevet låg på köksbordet.");
  });

  it("writes a web page with the chapter as a heading", () => {
    const page = asText("html");
    expect(page).toContain("<h3>1. Brevet</h3>");
    expect(page).toContain("<em>köksbordet</em>");
  });
});
