import { describe, expect, it } from "vitest";
import {
  bookProgress,
  bookStatus,
  readShelf,
  shelfGroups,
  whenUpdated,
} from "../src/project/shelf";
import { deadlineLine } from "../src/project/shelfLines";
import { createMemoryFileSystem } from "../src/storage/memoryFileSystem";

const DAY = 24 * 60 * 60 * 1000;

describe("bookStatus and bookProgress", () => {
  const scenes = [
    { title: "A", words: 600, status: "utkast" as const },
    { title: "B", words: 300, status: "klar" as const },
    { title: "C", words: 100, status: "idé" as const },
  ];

  it("names the stage that holds the most words", () => {
    expect(bookStatus(scenes)).toBe("Första utkast");
    expect(bookStatus([])).toBe("Idé");
  });

  it("counts the share of words in finished scenes", () => {
    expect(bookProgress(scenes)).toBe(30);
    expect(bookProgress([])).toBe(0);
  });
});

describe("whenUpdated", () => {
  const now = new Date("2026-10-03T15:00:00").getTime();

  it("says today, yesterday, days or weeks ago, or the date", () => {
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
    expect(books[0]?.stage).toBe("klar");
  });
});

describe("shelfGroups", () => {
  it("keeps the books of a series together under its name, books on their own first", async () => {
    const files = createMemoryFileSystem({
      "/Penna/A.penna/project.json": '{"title":"Isen","series":"Vintern.serie","tree":[]}',
      "/Penna/B.penna/project.json": '{"title":"Fristående","tree":[]}',
      "/Penna/C.penna/project.json": '{"title":"Fyren","series":"Vintern.serie","tree":[]}',
    });
    const books = await readShelf(files, "/Penna", []);

    const groups = shelfGroups(books);

    expect(groups.map((group) => [group.series, group.books.map((book) => book.title)])).toEqual([
      [null, ["Fristående"]],
      ["Vintern", ["Isen", "Fyren"]],
    ]);
  });

  it("orders a series by the books' numbers, and books without a number last", async () => {
    const files = createMemoryFileSystem({
      "/Penna/A.penna/project.json":
        '{"title":"Tvåan","series":"V.serie","seriesNumber":2,"tree":[]}',
      "/Penna/B.penna/project.json": '{"title":"Utan","series":"V.serie","tree":[]}',
      "/Penna/C.penna/project.json":
        '{"title":"Ettan","series":"V.serie","seriesNumber":1,"tree":[]}',
    });
    const books = await readShelf(files, "/Penna", []);

    const [series] = shelfGroups(books);

    expect(series?.books.map((book) => [book.title, book.seriesNumber])).toEqual([
      ["Ettan", 1],
      ["Tvåan", 2],
      ["Utan", null],
    ]);
  });
});

describe("a book being written", () => {
  it("counts its words toward the goal, and says what the deadline asks per day", async () => {
    const files = createMemoryFileSystem({
      "/Penna/Isen.penna/project.json":
        '{"title":"Isen","totalGoal":1000,"deadline":"2027-01-31","genre":"deckare","tree":[]}',
      "/Penna/Isen.penna/scenes/S1.md": "---\nid: S1\ntitle: A\nstatus: utkast\n---\nTvå ord.",
    });

    const [book] = await readShelf(files, "/Penna", []);

    expect(book).toMatchObject({ goal: 1000, progress: 0, genre: "deckare" });
    expect(book && deadlineLine(book, "2027-01-01")).toBe("4 veckor kvar · 34 ord/dag");
    expect(book && deadlineLine(book, "2027-01-25")).toBe("6 dagar kvar · 167 ord/dag");
    expect(book && deadlineLine(book, "2027-02-01")).toBe("Deadline passerad");
  });

  it("stands first on the shelf when it was written in last", async () => {
    const files = createMemoryFileSystem({
      "/Penna/A.penna/project.json": '{"title":"Gammal","tree":[]}',
      "/Penna/B.penna/project.json": '{"title":"Ny","tree":[]}',
    });
    const books = await readShelf(files, "/Penna", []);
    const [old, recent] = books;
    if (!old || !recent) throw new Error("two books expected");

    const [group] = shelfGroups([
      { ...old, updatedAt: 1 },
      { ...recent, updatedAt: 2 },
    ]);

    expect(group?.books.map((book) => book.title)).toEqual(["Ny", "Gammal"]);
  });
});
