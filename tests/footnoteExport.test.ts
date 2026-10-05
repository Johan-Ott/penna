import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { bookOutline, readBookScenes } from "../src/export/book";
import { standardManuscript } from "../src/export/standardManuscript";
import { sceneTypst } from "../src/export/typstText";
import { sceneXhtml } from "../src/export/xhtml";
import { parseMarkdown } from "../src/manuscript/parseMarkdown";
import { withSpecialFolders } from "../src/project/tree";
import { createMemoryFileSystem } from "../src/storage/memoryFileSystem";

const BODY = "Fyren byggdes 1872[^1] på udden.\n\n[^1]: Enligt sjökortet.\n";

describe("footnotes in export", () => {
  it("become Word footnotes in the standard manuscript", async () => {
    const files = createMemoryFileSystem({
      "/bok/scenes/S1.md": `---\nid: S1\ntitle: Udden\n---\n${BODY}`,
    });
    const tree = withSpecialFolders([{ id: "S1", kind: "scene" }]);
    const scenes = await readBookScenes(files, "/bok", ["S1"], {});

    const bytes = await standardManuscript({
      book: { title: "Fyren", subtitle: "", author: "Elin", words: 5 },
      outline: bookOutline(tree),
      scenes,
      typography: "svensk",
      language: "sv-SE",
      hasTitlePage: false,
    });

    const zip = await JSZip.loadAsync(bytes);
    expect(await zip.file("word/footnotes.xml")?.async("string")).toContain("Enligt sjökortet.");
    expect(await zip.file("word/document.xml")?.async("string")).toContain("w:footnoteReference");
  });

  it("become notes an e-reader shows on a tap, in the EPUB", () => {
    const html = sceneXhtml(parseMarkdown(BODY), "svensk", "S1");

    expect(html).toContain(
      '<a epub:type="noteref" href="#note-S1-1" id="ref-S1-1"><sup>1</sup></a>',
    );
    expect(html).toContain('<aside epub:type="footnote" id="note-S1-1">');
    expect(html).toContain("Enligt sjökortet.");
  });

  it("become Typst footnotes in the print PDF", () => {
    const options = { typography: "svensk" as const, sceneBreak: "* * *", hasDropCap: false };

    const typst = sceneTypst(parseMarkdown(BODY), options);

    expect(typst).toContain("1872#footnote[Enligt sjökortet.]");
  });
});
