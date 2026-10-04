import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { bookOutline, readBookScenes } from "../src/export/book";
import { DEFAULT_DESIGN } from "../src/export/bookDesign";
import { createTypst } from "../src/export/typstCompile";
import { typstSource, type PrintInput } from "../src/export/typstBook";
import { withSpecialFolders, type TreeNode } from "../src/project/tree";
import { createMemoryFileSystem } from "../src/storage/memoryFileSystem";

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

const tree: TreeNode[] = withSpecialFolders([
  {
    id: "del1",
    kind: "part",
    title: "Vintern",
    children: [
      {
        id: "kap1",
        kind: "chapter",
        title: "Brevet",
        children: [
          { id: "koket", kind: "scene" },
          { id: "isen", kind: "scene" },
        ],
      },
    ],
  },
]);
const scene = (id: string, body: string) => `---\nid: ${id}\ntitle: ${id}\n---\n${body}`;
// Text with every character Typst could read as code, which must come out as text.
const TRICKY =
  "# Rubrik? \\*inte fet\\* `kod` $5 <x> @ref [hak] ~ = + 1/2 // inte (parentes) {klammer}";
const FILES = {
  "/bok/scenes/koket.md": scene("koket", `Brevet låg på *bordet*(alltid).\n\n${TRICKY}\n`),
  "/bok/scenes/isen.md": scene(
    "isen",
    ":::brev\nKära Elin.\n:::\n\n:::meddelande\nKom hem.\n:::\n\nHon sa ”nej”.\n",
  ),
};

async function input(): Promise<PrintInput> {
  const files = createMemoryFileSystem(FILES);
  const outline = bookOutline(tree);
  const scenes = await readBookScenes(files, "/bok", ["koket", "isen"], {});
  return {
    book: { title: "Vintervägen", subtitle: "Roman", author: "Elin Berg", words: 40 },
    outline,
    scenes,
    typography: "svensk",
    language: "sv-SE",
    design: DEFAULT_DESIGN,
    parts: { hasTitlePage: true, hasCopyrightPage: true, hasContents: true },
    extras: { dedication: "Till Henrik", about: "Elin Berg bor på Gotland." },
    year: 2026,
  };
}

describe("typstSource", () => {
  it("sets the page size and font from the design, with the anfang on the chapter's first letter", async () => {
    const source = typstSource({
      ...(await input()),
      design: { ...DEFAULT_DESIGN, trim: "150x230" },
    });

    expect(source).toContain("width: 150mm");
    expect(source).toContain("height: 230mm");
    expect(source).toContain('font: "Literata"');
    expect(source).toContain('#kapitel("Kapitel 1", "Brevet")');
    expect(source).toContain("#anfang[B]revet");
    expect(source).toContain("#scenbrytning[\\* \\* \\*]");
  });

  it("compiles to a PDF and to preview pages without Typst errors, whatever the text holds", async () => {
    const source = typstSource(await input());

    const pdf = await typst.pdf(source);
    const svg = await typst.svg(source);

    expect(new TextDecoder().decode(pdf.slice(0, 5))).toBe("%PDF-");
    expect(svg).toContain("<svg");
  }, 30_000);
});
