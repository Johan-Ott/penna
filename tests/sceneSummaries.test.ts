import { describe, expect, it } from "vitest";
import { parseMarkdown } from "../src/manuscript/parseMarkdown";
import { countDocumentWords } from "../src/manuscript/wordCount";
import { readSceneSummaries } from "../src/project/sceneSummaries";
import { createMemoryFileSystem } from "../src/storage/memoryFileSystem";

describe("countDocumentWords", () => {
  it("counts words in paragraphs, styles and raw blocks but not scene breaks", () => {
    const doc = parseMarkdown("Ett två.\n\n* * *\n\n::: brev\nTre fyra\n:::\n\n# Fem\n");

    const words = countDocumentWords(doc);

    expect(words).toBe(5);
  });
});

describe("readSceneSummaries", () => {
  it("reads each scene's title and word count and names a scene without a title", async () => {
    const files = createMemoryFileSystem({
      "/bok/scenes/SCENE1.md": "---\nid: SCENE1\ntitle: Köket\n---\nBrevet låg där.",
      "/bok/scenes/SCENE2.md": "Bara text.",
    });

    const summaries = await readSceneSummaries(files, "/bok", ["SCENE1", "SCENE2"]);

    expect(summaries).toEqual({
      SCENE1: { title: "Köket", words: 3, status: "idé" },
      SCENE2: { title: "Namnlös scen", words: 2, status: "idé" },
    });
  });
});
