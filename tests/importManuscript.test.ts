import { describe, expect, it } from "vitest";
import { importManuscript } from "../src/import/importManuscript";
import { createMemoryFileSystem } from "../src/storage/memoryFileSystem";

const bytesOf = (text: string) => new TextEncoder().encode(text);

describe("importManuscript", () => {
  it("names the book after a Markdown or text file and splits it at its headings", async () => {
    const files = createMemoryFileSystem({});

    const imported = await importManuscript(files, {
      path: "C:/Manus/Vintervägen.md",
      bytes: bytesOf("# Brevet\n\nBrevet låg där.\n"),
    });

    expect(imported.title).toBe("Vintervägen");
    expect(imported.book).toMatchObject([{ kind: "chapter", title: "Brevet" }]);
  });

  it("reads the Scrivener project around a picked .scrivx file", async () => {
    const binder =
      '<Binder><BinderItem UUID="D" Type="DraftFolder"><Title>Draft</Title><Children>' +
      '<BinderItem UUID="S1" Type="Text"><Title>Köket</Title></BinderItem>' +
      "</Children></BinderItem></Binder>";
    const files = createMemoryFileSystem({ "/Isen.scriv/Isen.scrivx": binder });

    const imported = await importManuscript(files, {
      path: "/Isen.scriv/Isen.scrivx",
      bytes: bytesOf(binder),
    });

    expect(imported.title).toBe("Isen");
    expect(imported.book).toMatchObject([{ kind: "scene", title: "Köket" }]);
  });

  it("says so when a file holds no text", async () => {
    const files = createMemoryFileSystem({});

    const attempt = importManuscript(files, { path: "tom.txt", bytes: bytesOf("\n\n") });

    await expect(attempt).rejects.toThrow("Filen innehöll ingen text att importera.");
  });
});
