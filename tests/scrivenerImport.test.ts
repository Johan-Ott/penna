import { describe, expect, it } from "vitest";
import { rtfToMarkdown } from "../src/import/rtf";
import { readScrivener } from "../src/import/scrivenerImport";
import type { ImportedNode } from "../src/import/markdownImport";
import { createMemoryFileSystem } from "../src/storage/memoryFileSystem";

describe("rtfToMarkdown", () => {
  it("reads paragraphs, italic and bold, and skips the font and color tables", () => {
    const rtf =
      "{\\rtf1\\ansi\\ansicpg1252{\\fonttbl\\f0\\fswiss Helvetica;}{\\colortbl;\\red255;}\n" +
      "\\pard\\f0 Hon l\\'e4ste {\\i brevet} och \\b log\\b0 .\\par\nIsen bar.}";

    const markdown = rtfToMarkdown(rtf);

    expect(markdown).toBe("Hon läste *brevet* och **log**.\n\nIsen bar.\n");
  });

  it("reads unicode characters, Scrivener's comments groups and typographic words", () => {
    const rtf =
      "{\\rtf1\\uc1 {\\*\\Scrv_annot gömd}\\ldblquote K\\u228?ra\\rdblquote  \\endash  sa hon.\\par}";

    const markdown = rtfToMarkdown(rtf);

    expect(markdown).toBe("“Kära” – sa hon.\n");
  });
});

const BINDER = `<?xml version="1.0" encoding="UTF-8"?>
<ScrivenerProject>
  <Binder>
    <BinderItem UUID="D" Type="DraftFolder"><Title>Manus</Title><Children>
      <BinderItem UUID="P1" Type="Folder"><Title>Del ett</Title><Children>
        <BinderItem UUID="C1" Type="Folder"><Title>Brevet</Title><Children>
          <BinderItem UUID="S1" Type="Text"><Title>Köket</Title></BinderItem>
          <BinderItem UUID="S2" Type="Text"><Title>Isen &amp; ljuset</Title></BinderItem>
        </Children></BinderItem>
      </Children></BinderItem>
    </Children></BinderItem>
    <BinderItem UUID="R" Type="ResearchFolder"><Title>Research</Title></BinderItem>
  </Binder>
</ScrivenerProject>`;

const shape = (nodes: ImportedNode[]): unknown[] =>
  nodes.map((node) =>
    node.kind === "scene"
      ? `${node.title}: ${node.body}`
      : { [`${node.kind} ${node.title}`]: shape(node.children) },
  );

describe("readScrivener", () => {
  it("reads the draft folder as parts, chapters and scenes, with each text's RTF", async () => {
    const files = createMemoryFileSystem({
      "/Vinter.scriv/Vinter.scrivx": BINDER,
      "/Vinter.scriv/Files/Data/S1/content.rtf": "{\\rtf1 Brevet l\\'e5g d\\'e4r.\\par}",
    });

    const book = await readScrivener(files, "/Vinter.scriv");

    expect(shape(book)).toEqual([
      {
        "part Del ett": [{ "chapter Brevet": ["Köket: Brevet låg där.\n", "Isen & ljuset: "] }],
      },
    ]);
  });
});
