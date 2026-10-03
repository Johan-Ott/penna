import { describe, expect, it } from "vitest";
import { bookProgress, bookStatus, readShelf, whenUpdated } from "../src/project/shelf";
import { createMemoryFileSystem } from "../src/storage/memoryFileSystem";

const DAY = 24 * 60 * 60 * 1000;

describe("bookStatus and bookProgress", () => {
  const scenes = [
    { title: "A", words: 600, status: "utkast" as const },
    { title: "B", words: 300, status: "klar" as const },
    { title: "C", words: 100, status: "idé" as const },
  ];

  it("names the stage that holds the most words", () => {
    expect(bookStatus(scenes)).toBe("Utkast");
    expect(bookStatus([])).toBe("Idé");
  });

  it("counts the share of words in finished scenes", () => {
    expect(bookProgress(scenes)).toBe(30);
    expect(bookProgress([])).toBe(0);
  });
});

describe("whenUpdated", () => {
  const now = new Date("2026-10-03T15:00:00").getTime();

  it("speaks of days the way the design does", () => {
    expect(whenUpdated(now - 60_000, now)).toBe("Skrivet idag");
    expect(whenUpdated(now - DAY, now)).toBe("Igår");
    expect(whenUpdated(now - 3 * DAY, now)).toBe("För 3 dagar sedan");
    expect(whenUpdated(now - 15 * DAY, now)).toBe("För 2 veckor sedan");
    expect(whenUpdated(now - 90 * DAY, now)).toBe("5 juli 2026");
  });
});

describe("readShelf", () => {
  it("lists the projects in the library and those opened from elsewhere, and marks missing ones", async () => {
    const files = createMemoryFileSystem({
      "/Penna/Isen.penna/project.json": '{"title":"Isen","type":"roman","tree":[]}',
      "/Penna/Isen.penna/scenes/S1.md": "---\nid: S1\ntitle: A\nstatus: klar\n---\nTvå ord.",
      "/Penna/inte-ett-projekt/anteckning.md": "x",
      "/Annat/Fyren.penna/project.json": '{"title":"Fyren","tree":[]}',
    });

    const books = await readShelf(files, "/Penna", [
      "/Annat/Fyren.penna",
      "/Borta/Saltstank.penna",
    ]);

    expect(books.map((book) => [book.title, book.isMissing])).toEqual([
      ["Isen", false],
      ["Fyren", false],
      ["Saltstank", true],
    ]);
    expect(books[0]).toMatchObject({ kind: "Roman", words: 2, status: "Klar", progress: 100 });
  });
});
