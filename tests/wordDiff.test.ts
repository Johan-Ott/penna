import { describe, expect, it } from "vitest";
import { changedWords, diffWords } from "../src/manuscript/wordDiff";

describe("diffWords", () => {
  it("marks what the old version had and the new one has, word by word", () => {
    const old = "isen lagt sig över viken, tung och grå, och bortom";
    const now = "isen lagt sig över viken, grå och orörlig, och bortom";

    const parts = diffWords(old, now);

    expect(parts).toEqual([
      { kind: "same", text: "isen lagt sig över viken, " },
      { kind: "removed", text: "tung och grå, " },
      { kind: "added", text: "grå och orörlig, " },
      { kind: "same", text: "och bortom" },
    ]);
  });

  it("gives the whole text as one part when nothing changed", () => {
    const parts = diffWords("Brevet låg där.", "Brevet låg där.");

    expect(parts).toEqual([{ kind: "same", text: "Brevet låg där." }]);
  });

  it("keeps paragraph breaks in the text so they can be shown", () => {
    const parts = diffWords("Ett.\n\nTvå.", "Ett.\n\nTre.");

    expect(parts).toEqual([
      { kind: "same", text: "Ett.\n\n" },
      { kind: "removed", text: "Två." },
      { kind: "added", text: "Tre." },
    ]);
  });
});

describe("changedWords", () => {
  it("counts the words in the part that differs, on the larger side", () => {
    const counts = [
      changedWords("a b c d e", "a b c d e"),
      changedWords("a b c d e", "a x y z e"),
      changedWords("a b", "a b c d e f"),
    ];

    expect(counts).toEqual([0, 3, 4]);
  });
});
