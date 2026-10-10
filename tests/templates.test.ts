import { describe, expect, it } from "vitest";
import {
  parseTemplate,
  readOwnTemplates,
  saveOwnTemplate,
  templateFromBook,
} from "../src/project/ownTemplates";
import { composeTemplate, structures, suggestedStructure } from "../src/project/templates";
import { withSpecialFolders, type TreeNode } from "../src/project/tree";
import { createMemoryFileSystem } from "../src/storage/memoryFileSystem";

const mystery = () => structures().find((structure) => structure.id === "deckare");

describe("structures and pieces", () => {
  it("add the pieces' notes, labels and closing chapter to the structure", () => {
    const structure = mystery();
    if (!structure) throw new Error("no mystery structure");

    const book = composeTemplate(structure, ["deckare", "romans", "magi", "urban", "serie"]);

    expect(book.sorts).toEqual([
      "Misstänkta",
      "Ledtrådar",
      "Tidslinje",
      "Relationen",
      "Magisystem",
      "Riken",
      "Varelser",
      "Staden",
      "Den dolda världen",
    ]);
    expect(book.labels.map(([name]) => name)).toEqual(
      expect.arrayContaining(["Skriv om", "Ledtråd", "Romans", "Magi"]),
    );
    expect(book.parts.at(-1)?.chapters).toEqual([
      ["Kroken", "Ett nytt hot eller en hemlighet som leder till nästa bok."],
    ]);
  });

  it("are suggested from the kind of book and its pieces", () => {
    expect(suggestedStructure("roman", ["romans", "deckare", "urban"])).toBe("deckare");
    expect(suggestedStructure("roman", ["romans", "magi"])).toBe("romantasy");
    expect(suggestedStructure("roman", [])).toBe("tre-akter");
    expect(suggestedStructure("noveller", ["deckare"])).toBe("novell");
    expect(suggestedStructure("fackbok", [])).toBe("tom");
  });

  it("keep Penna's standard labels to themselves when no piece adds any", () => {
    const structure = mystery();
    if (!structure) throw new Error("no mystery structure");

    expect(composeTemplate(structure, ["urban"]).labels).toEqual([]);
  });
});

describe("own templates", () => {
  const tree: TreeNode[] = withSpecialFolders([
    {
      id: "del",
      kind: "part",
      title: "Brottet",
      children: [
        { id: "k1", kind: "chapter", title: "Kroppen", summary: "Den hittas.", children: [] },
      ],
    },
    { id: "k2", kind: "chapter", title: "Efteråt", children: [] },
    { id: "sort", kind: "sort", title: "Misstänkta", children: [] },
  ]);

  it("take a book's shape, and are kept and read back from the Penna folder", async () => {
    const files = createMemoryFileSystem({});
    const template = templateFromBook("Min deckare", { tree, fields: { totalGoal: 70_000 } });

    await saveOwnTemplate(files, "/Penna", template);
    const [read] = await readOwnTemplates(files, "/Penna");

    expect(read).toMatchObject({
      id: "egen:Min deckare.json",
      name: "Min deckare",
      totalGoal: 70_000,
      sorts: ["Misstänkta"],
      parts: [
        { title: "Brottet", chapters: [["Kroppen", "Den hittas."]] },
        { title: "", chapters: [["Efteråt", ""]] },
      ],
    });
  });

  it("are not read from a file that is not a template", () => {
    expect(parseTemplate('{"name": 3}', "egen:x")).toBeNull();
    expect(parseTemplate("inte json", "egen:x")).toBeNull();
  });
});
