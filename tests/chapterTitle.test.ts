import { describe, expect, it } from "vitest";
import { DEFAULT_DESIGN } from "../src/export/bookDesign";
import { contentsLabel } from "../src/export/bookWords";
import { openingHtml } from "../src/export/epubDesign";

const newBooksChapter = { kind: "chapter" as const, number: 1, title: "Kapitel 1" };

describe("a chapter whose title repeats its label", () => {
  it("is printed once in the chapter heading", () => {
    const look = { design: { ...DEFAULT_DESIGN, chapterLabel: "ord" as const }, images: new Map() };

    const heading = openingHtml(newBooksChapter, "sv-SE", look);

    expect(heading).toContain('<span class="label">Kapitel 1</span>');
    expect(heading).not.toContain('<span class="title">');
  });

  it("stays as the heading when the design prints no label", () => {
    const look = {
      design: { ...DEFAULT_DESIGN, chapterLabel: "ingen" as const },
      images: new Map(),
    };

    const heading = openingHtml(newBooksChapter, "sv-SE", look);

    expect(heading).toContain('<span class="title">Kapitel 1</span>');
  });

  it("is printed once in the contents", () => {
    expect(contentsLabel(newBooksChapter, "sv-SE")).toBe("Kapitel 1");
  });

  it("keeps a real title after the label", () => {
    expect(contentsLabel({ ...newBooksChapter, title: "Brevet" }, "sv-SE")).toBe(
      "Kapitel 1. Brevet",
    );
  });
});
