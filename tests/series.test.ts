import { describe, expect, it } from "vitest";
import { readProjectFile } from "../src/project/projectFile";
import { connectionsOf } from "../src/project/connections";
import {
  createSeries,
  listSeries,
  moveNotesToSeries,
  seriesDirOf,
  seriesTitle,
} from "../src/project/series";
import { CHARACTERS_ID, findNode, sortsOf, withSpecialFolders } from "../src/project/tree";
import { createMemoryFileSystem } from "../src/storage/memoryFileSystem";

describe("series", () => {
  it("makes a series folder beside the books that holds only the note sorts", async () => {
    const files = createMemoryFileSystem({ "/Penna/Vintervägen.penna/project.json": "{}" });

    const folder = await createSeries(files, "/Penna", "Vintervägen");

    const series = await readProjectFile(files, `/Penna/${folder}`, []);
    expect(folder).toBe("Vintervägen.serie");
    expect(series.fields).toMatchObject({ title: "Vintervägen", type: "serie" });
    expect(sortsOf(series.tree)).toHaveLength(4);
    expect(series.tree.filter((node) => node.kind !== "sort").map((node) => node.id)).toEqual([
      "trash",
    ]);
  });

  it("does not take a folder that is already there", async () => {
    const files = createMemoryFileSystem({ "/Penna/Isen.serie/project.json": "{}" });

    const folder = await createSeries(files, "/Penna", "Isen");

    expect(folder).toBe("Isen 2.serie");
  });

  it("lists the series in a folder and finds a book's series beside it", async () => {
    const files = createMemoryFileSystem({
      "/Penna/Isen.serie/project.json": "{}",
      "/Penna/Bok.penna/project.json": "{}",
    });

    const found = await listSeries(files, "/Penna");

    expect(found).toEqual(["Isen.serie"]);
    expect(seriesDirOf("/Penna/Bok.penna", { series: "Isen.serie" })).toBe("/Penna/Isen.serie");
    expect(seriesDirOf("/Penna/Bok.penna", {})).toBeNull();
    expect(seriesTitle("Isen 2.serie")).toBe("Isen 2");
  });
});

describe("moveNotesToSeries", () => {
  it("moves a book's notes into the same sorts of the series, file and connections too", async () => {
    const files = createMemoryFileSystem({
      "/Penna/Bok.penna/scenes/arvid.md": "---\ntitle: Arvid\n---\nFiskare.",
      "/Penna/Bok.penna/scenes/fordon.md": "---\ntitle: Volvon\n---\n",
    });
    const book = {
      dir: "/Penna/Bok.penna",
      fields: { connections: { arvid: [{ id: "elin", role: "brorsdotter" }] } },
      tree: withSpecialFolders([
        { id: CHARACTERS_ID, kind: "sort", children: [{ id: "arvid", kind: "scene" }] },
        { id: "egen", kind: "sort", title: "Fordon", children: [{ id: "fordon", kind: "scene" }] },
      ]),
    };
    const series = { dir: "/Penna/Isen.serie", fields: {}, tree: withSpecialFolders([]) };

    const moved = await moveNotesToSeries(files, book, series, ["arvid", "fordon"]);

    expect(await files.readText("/Penna/Isen.serie/scenes/arvid.md")).toContain("Fiskare.");
    expect(await files.list("/Penna/Bok.penna/scenes")).toEqual([]);
    expect(findNode(moved.seriesTree, "arvid")?.parent?.id).toBe(CHARACTERS_ID);
    expect(findNode(moved.seriesTree, "fordon")?.parent).toMatchObject({
      id: "egen",
      title: "Fordon",
    });
    expect(findNode(moved.bookTree, "arvid")).toBeNull();
    expect(connectionsOf(moved.seriesFields, "arvid")).toEqual([
      { id: "elin", role: "brorsdotter" },
    ]);
  });
});
