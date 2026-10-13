import { describe, expect, it } from "vitest";
import { readSceneSummaries } from "../src/project/sceneSummaries";
import { createFileNote, saveResearchFile } from "../src/project/researchFiles";
import { createMemoryFileSystem } from "../src/storage/memoryFileSystem";

describe("research files", () => {
  it("are copied into filer/ under a free name, so a file there is never replaced", async () => {
    const files = createMemoryFileSystem({ "/bok/filer/karta.pdf": "gammal" });
    const bytes = new TextEncoder().encode("ny");

    const name = await saveResearchFile(files, "/bok", "C:/Hämtade/karta.pdf", bytes);

    expect(name).toBe("karta 2.pdf");
    expect(await files.readText("/bok/filer/karta.pdf")).toBe("gammal");
    expect(await files.readText("/bok/filer/karta 2.pdf")).toBe("ny");
  });

  it("become a note named after the file, which knows its file", async () => {
    const files = createMemoryFileSystem({});

    const id = await createFileNote(files, "/bok", "Fyrar: 1890.pdf");

    const summaries = await readSceneSummaries(files, "/bok", [id]);
    expect(summaries[id]).toMatchObject({ title: "Fyrar: 1890", file: "Fyrar: 1890.pdf" });
  });
});
