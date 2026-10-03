import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { bookOutline, readBookScenes } from "../src/export/book";
import { buildEpub } from "../src/export/epub";
import { withSpecialFolders, type TreeNode } from "../src/project/tree";
import { createMemoryFileSystem } from "../src/storage/memoryFileSystem";

const tree: TreeNode[] = withSpecialFolders([
  { id: "01INLEDNING", kind: "scene" },
  {
    id: "kap1",
    kind: "chapter",
    title: "Brevet",
    children: [
      { id: "01KOKET", kind: "scene" },
      { id: "01ISEN", kind: "scene" },
    ],
  },
  { id: "kap2", kind: "chapter", title: "Fyren & havet", children: [] },
]);
const scene = (id: string, body: string) => `---\nid: ${id}\ntitle: ${id}\n---\n${body}`;
const FILES = {
  "/bok/scenes/01INLEDNING.md": scene("01INLEDNING", "Det var vinter.\n"),
  "/bok/scenes/01KOKET.md": scene("01KOKET", "Brevet låg på *bordet* <& så>.\n\n– Vet du?\n"),
  "/bok/scenes/01ISEN.md": scene("01ISEN", ":::brev\nKära Elin.\n:::\n\nHon sa ”nej”.\n"),
};
const BOOK = { title: "Vintervägen", subtitle: "Roman", author: "Elin Berg", words: 1200 };

async function build() {
  const files = createMemoryFileSystem(FILES);
  const outline = bookOutline(tree);
  const ids = outline.flatMap((item) => (item.kind === "scene" ? [item.id] : []));
  const scenes = await readBookScenes(files, "/bok", ids, {});
  const bytes = await buildEpub({
    book: BOOK,
    outline,
    scenes,
    typography: "svensk",
    identifier: "urn:uuid:3f1c2a64-0d5e-4b7a-9a1e-6c2b8d4e5f70",
    modified: new Date("2026-10-03T12:00:00Z"),
    parts: { hasTitlePage: true, hasCopyrightPage: true, hasContents: true },
  });
  return { bytes, zip: await JSZip.loadAsync(bytes) };
}

const read = (zip: JSZip, path: string) => zip.file(path)?.async("string") ?? Promise.resolve("");

describe("buildEpub", () => {
  it("starts with an uncompressed mimetype, as EPUB readers require", async () => {
    const { bytes } = await build();

    const header = new TextDecoder().decode(bytes.slice(30, 58));

    expect(header).toBe("mimetypeapplication/epub+zip");
  });

  it("points the container at the package, which lists every page in reading order", async () => {
    const { zip } = await build();
    const container = await read(zip, "META-INF/container.xml");
    const opf = await read(zip, "OEBPS/content.opf");

    expect(container).toContain('full-path="OEBPS/content.opf"');
    expect(opf).toContain("<dc:title>Vintervägen</dc:title>");
    expect(opf).toContain("<dc:creator>Elin Berg</dc:creator>");
    expect(opf).toContain("<dc:language>sv</dc:language>");
    expect(opf).toContain("2026-10-03T12:00:00Z");
    expect(opf).toContain('properties="cover-image"');
    const spine = [...opf.matchAll(/<itemref idref="([^"]+)"/g)].map((match) => match[1]);
    expect(spine).toEqual([
      "cover",
      "title",
      "copyright",
      "nav",
      "opening",
      "chapter-1",
      "chapter-2",
    ]);
  });

  it("lists the chapters in the table of contents", async () => {
    const { zip } = await build();

    const nav = await read(zip, "OEBPS/nav.xhtml");

    expect(nav).toContain('epub:type="toc"');
    expect(nav).toContain('<a href="text/chapter-1.xhtml">Kapitel 1. Brevet</a>');
    expect(nav).toContain("Kapitel 2. Fyren &amp; havet");
  });

  it("writes the scenes as XHTML with escaped text, emphasis, scene breaks and styles", async () => {
    const { zip } = await build();

    const chapter = await read(zip, "OEBPS/text/chapter-1.xhtml");

    expect(chapter).toContain('<html xmlns="http://www.w3.org/1999/xhtml"');
    expect(chapter).toContain("<em>bordet</em> &lt;&amp; så&gt;.");
    expect(chapter).toContain('<hr class="scene-break"');
    expect(chapter).toContain('<div class="brev">');
    expect(chapter).toContain("Hon sa ”nej”.");
  });

  it("has a cover and a copyright page with the author", async () => {
    const { zip } = await build();

    const [cover, copyright] = [
      await read(zip, "OEBPS/cover.svg"),
      await read(zip, "OEBPS/text/copyright.xhtml"),
    ];

    expect(cover).toContain("Vintervägen");
    expect(copyright).toContain("© 2026 Elin Berg");
  });
});

describe("buildEpub with a cover picture", () => {
  it("uses the writer's picture instead of the typographic cover", async () => {
    const files = createMemoryFileSystem(FILES);
    const outline = bookOutline(tree);
    const ids = outline.flatMap((item) => (item.kind === "scene" ? [item.id] : []));
    const scenes = await readBookScenes(files, "/bok", ids, {});
    const picture = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);

    const bytes = await buildEpub({
      book: BOOK,
      outline,
      scenes,
      typography: "svensk",
      identifier: "urn:uuid:3f1c2a64-0d5e-4b7a-9a1e-6c2b8d4e5f70",
      modified: new Date("2026-10-03T12:00:00Z"),
      parts: { hasTitlePage: false, hasCopyrightPage: false, hasContents: false },
      cover: { type: "jpeg", bytes: picture },
    });

    const zip = await JSZip.loadAsync(bytes);
    const opf = await read(zip, "OEBPS/content.opf");
    expect(opf).toContain('href="cover.jpg" media-type="image/jpeg" properties="cover-image"');
    expect(zip.file("OEBPS/cover.svg")).toBeNull();
    expect(await zip.file("OEBPS/cover.jpg")?.async("uint8array")).toEqual(picture);
    expect(await read(zip, "OEBPS/text/cover.xhtml")).toContain('src="../cover.jpg"');
  });
});
