import { describe, expect, it } from "vitest";
import { manuscriptSchema as schema } from "../src/manuscript/schema";
import { wordAt, wordsIn } from "../src/editor/spellingMarks";

const doc = schema.node("doc", null, [
  schema.node("paragraph", null, [schema.text("Elins köksbord, sa hon – i går.")]),
]);

describe("spelling marks", () => {
  it("finds each word with its place, keeping a word with a hyphen or apostrophe whole", () => {
    const words = wordsIn(doc).map((place) => place.word);

    expect(words).toEqual(["Elins", "köksbord", "sa", "hon", "i", "går"]);
  });

  it("finds the word under a position, for its corrections", () => {
    const [first] = wordsIn(doc);

    expect(wordAt(doc, (first?.from ?? 0) + 2)?.word).toBe("Elins");
  });
});
