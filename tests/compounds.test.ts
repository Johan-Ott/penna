import { describe, expect, it } from "vitest";
import { splitCompounds } from "../src/manuscript/compounds";

const known = new Set(["sjuksköterska", "eftersom", "idag", "engång"]);
const misspelled = async (words: string[]) => words.filter((word) => !known.has(word));

describe("splitCompounds", () => {
  it("asks about words written apart that the dictionary knows as one", async () => {
    const notes = await splitCompounds(
      "Hon var sjuk sköterska, efter som det behövdes.",
      "sv-SE",
      misspelled,
    );

    expect(notes.map((note) => note.text)).toEqual([
      "”sjuk sköterska” → ”sjuksköterska”, ”efter som” → ”eftersom”. Skrivs ihop om det är ett ord.",
    ]);
  });

  it("leaves short words, pairs across punctuation, and other languages", async () => {
    expect(
      await splitCompounds("Jag kom i dag, en gång. Efter. Som.", "sv-SE", misspelled),
    ).toEqual([]);
    expect(await splitCompounds("sjuk sköterska", "en-GB", misspelled)).toEqual([]);
  });
});
