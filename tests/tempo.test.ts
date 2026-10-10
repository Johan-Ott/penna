import { describe, expect, it } from "vitest";
import type { ContentsRow } from "../src/project/contents";
import { chapterTempo } from "../src/project/tempo";

const row = (number: number, sceneIds: string[]): ContentsRow => ({
  id: `k${number}`,
  number,
  title: `Kapitel ${number}`,
  summary: "",
  when: "",
  pov: "",
  words: 0,
  status: "utkast",
  sceneIds,
});

describe("chapterTempo", () => {
  it("measures length, the share spoken and words per sentence", () => {
    const texts = { first: "Hon gick hem.\n– Hej, sa hon.\n– Hej." };

    expect(chapterTempo([row(1, ["first"])], texts)[0]).toMatchObject({
      words: 7,
      dialogue: 4 / 7,
      sentence: 7 / 3,
    });
  });

  it("calls a chapter slow that is long, with little talk and long sentences", () => {
    const quick = "– Ja.\n– Nej.\nHon gick.";
    const slow = `${"Hon gick länge genom den snöiga skogen utan att se sig om ".repeat(8)}.`;
    const texts = { one: quick, two: quick, three: slow };
    const tempo = chapterTempo([row(1, ["one"]), row(2, ["two"]), row(3, ["three"])], texts);

    expect(tempo.map((chapter) => chapter.isSlow)).toEqual([false, false, true]);
  });
});
