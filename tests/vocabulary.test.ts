import { describe, expect, it } from "vitest";
import { learnWords } from "../src/editor/vocabulary";

describe("learnWords", () => {
  const texts = [
    "Elin såg upp, sa Arvid. Det kom ett brev, sa Arvid. Isen bar, sa Arvid.",
    "Hon kom in från kylan. Kylan bet. Han kom in från kylan igen.",
  ];

  it("keeps the words used twice or more, the most used first", () => {
    expect(learnWords(texts).words.slice(0, 2)).toEqual(["Arvid", "från"]);
  });

  it("offers the next word only when the book mostly says it", () => {
    const { nextOf } = learnWords(texts);
    expect(nextOf["sa"]).toBe("Arvid");
    expect(nextOf["kom"]).toBeUndefined();
  });
});
