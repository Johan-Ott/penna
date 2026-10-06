import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createTypst } from "../src/export/typstCompile";
import { coverSource, printCoverOf, spineWidth, type CoverInput } from "../src/export/typstCover";

const bytesOf = (path: string) => Promise.resolve(new Uint8Array(readFileSync(path)));
const typst = createTypst({
  compilerWasm: () =>
    bytesOf("node_modules/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm"),
  rendererWasm: () =>
    bytesOf("node_modules/@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm"),
  fonts: () =>
    Promise.all(
      readdirSync("public/fonts")
        .filter((name) => name.endsWith(".ttf"))
        .map((name) => bytesOf(`public/fonts/${name}`)),
    ),
});

const INPUT: CoverInput = {
  trim: "130x200",
  pages: 320,
  paper: "vitt",
  color: "natt",
  title: "Vintervägen",
  author: "Elin Berg",
  backText: "Brevet låg på köksbordet.\n\nIsen bär den som går lätt.",
  frontPicture: null,
};

describe("the print cover", () => {
  it("has a spine as thick as the pages on the chosen paper", () => {
    expect(spineWidth(320, "vitt")).toBe(18.3);
    expect(spineWidth(320, "kramvitt")).toBe(20.3);
  });

  it("is back, spine and front side by side, with bleed all round", () => {
    const source = coverSource(INPUT);

    expect(source).toContain("#let spine = 18.3mm");
    expect(source).toContain("#set page(width: 2 * panel-width + spine, height: full-height");
    expect(source).toContain("rotate(90deg");
  });

  it("leaves the spine without text when the book is too thin for it", () => {
    expect(coverSource({ ...INPUT, pages: 60 })).not.toContain("rotate(90deg");
  });

  it("compiles to a PDF", async () => {
    const pdf = await typst.pdf(coverSource(INPUT));

    expect(new TextDecoder().decode(pdf.slice(0, 5))).toBe("%PDF-");
  }, 30_000);

  it("reads the writer's choices, and falls back for anything unknown", () => {
    expect(printCoverOf({ printCover: { paper: "kramvitt", color: "skog" } })).toMatchObject({
      paper: "kramvitt",
      color: "skog",
    });
    expect(printCoverOf({ printCover: { color: "rosa" } }).color).toBe("natt");
  });
});
