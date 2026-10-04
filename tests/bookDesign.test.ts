import { describe, expect, it } from "vitest";
import { DEFAULT_DESIGN, designOf, previewOutline, trimSize } from "../src/export/bookDesign";

describe("designOf", () => {
  it("reads the book design from project.json", () => {
    const fields = {
      design: { trim: "150x230", bodyFont: "EB Garamond", bodySize: 11, dropCap: false },
    };

    const design = designOf(fields);

    expect(design).toEqual({
      ...DEFAULT_DESIGN,
      trim: "150x230",
      bodyFont: "EB Garamond",
      bodySize: 11,
      dropCap: false,
    });
  });

  it("falls back to Klassisk's defaults for anything missing or unknown", () => {
    const fields = { design: { trim: "1x1", bodyFont: "Comic Sans", bodySize: "stor" } };

    const design = designOf(fields);

    expect(design).toEqual(DEFAULT_DESIGN);
  });
});

describe("trimSize", () => {
  it("turns a trim into the page size in millimetres", () => {
    expect(trimSize("130x200")).toEqual({ width: 130, height: 200 });
  });
});

describe("previewOutline", () => {
  it("keeps the book up to the end of its first chapter", () => {
    const outline = [
      { kind: "part" as const, number: 1, title: "Vintern" },
      { kind: "chapter" as const, number: 1, title: "Brevet" },
      { kind: "scene" as const, id: "koket" },
      { kind: "scene" as const, id: "isen" },
      { kind: "chapter" as const, number: 2, title: "Fyren" },
      { kind: "scene" as const, id: "fyren" },
    ];

    const preview = previewOutline(outline);

    expect(preview.map((item) => (item.kind === "scene" ? item.id : item.title))).toEqual([
      "Vintern",
      "Brevet",
      "koket",
      "isen",
    ]);
  });
});
