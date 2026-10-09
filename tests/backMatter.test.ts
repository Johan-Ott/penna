import { describe, expect, it } from "vitest";
import { backPages, backTexts } from "../src/export/bookParts";
import { readExcerpt } from "../src/export/excerpt";
import { createMemoryFileSystem } from "../src/storage/memoryFileSystem";

const scene = (id: string, body: string) => `---\nid: ${id}\ntitle: ${id}\n---\n${body}`;

describe("the pages after the story", () => {
  const extras = {
    thanks: "Tack, Maja.",
    alsoBy: "Vintervägen\n\n  Natthamnen ",
    newsletter: "Skriv upp dig.",
    stores: "Adlibris https://adlibris.com/x\nBokus https://bokus.com/y",
    excerpt: { title: "Natthamnen", text: "Det var natt." },
  };

  it("come in the order books have them, each title to a line, and links only where they work", () => {
    const pages = backTexts(extras, "sv-SE", false);

    expect(pages.map((page) => page.title)).toEqual([
      "Tack",
      "Av samma författare",
      "Håll kontakten",
      "Ur Natthamnen",
    ]);
    expect(pages[1]?.text).toBe("Vintervägen\n\nNatthamnen");
  });

  it("make the stores links in the e-book", () => {
    const stores = backPages(extras, "sv-SE").find((page) => page.id === "stores");

    expect(stores?.body).toContain('<a href="https://adlibris.com/x">Adlibris</a>');
    expect(stores?.body).toContain('<a href="https://bokus.com/y">Bokus</a>');
  });
});

describe("readExcerpt", () => {
  it("reads the other book's first chapter as plain paragraphs", async () => {
    const tree = [
      { id: "k1", kind: "chapter", title: "Ett", children: [{ id: "s1", kind: "scene" }] },
      { id: "k2", kind: "chapter", title: "Två", children: [{ id: "s2", kind: "scene" }] },
    ];
    const files = createMemoryFileSystem({
      "/annan/project.json": JSON.stringify({ title: "Natthamnen", tree }),
      "/annan/scenes/s1.md": scene("s1", "Det var *natt*.\n\nHamnen sov.\n"),
      "/annan/scenes/s2.md": scene("s2", "Inte med.\n"),
    });

    expect(await readExcerpt(files, "/annan")).toEqual({
      title: "Natthamnen",
      text: "Det var natt.\n\nHamnen sov.",
    });
  });
});
