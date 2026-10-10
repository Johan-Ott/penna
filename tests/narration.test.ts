import { describe, expect, it } from "vitest";
import {
  narrationNotes,
  narrationOf,
  narrationText,
  type Narration,
} from "../src/manuscript/narration";

const deep: Narration = { voice: "tredje", tense: "dåtid", deep: true };
const kinds = (text: string, narration: Narration = deep, others: string[] = []) =>
  narrationNotes(text, "sv-SE", narration, others).map((note) => [note.kind, note.text]);

describe("narration", () => {
  it("leaves the lines spoken out of the narration", () => {
    expect(narrationText("Hon gick.\n– Jag är trött, sa hon.\nHon sa ”jag vet” och gick.")).toBe(
      "Hon gick.\nHon sa   och gick.",
    );
  });

  it("finds first person told in a third-person book, but not in the lines", () => {
    expect(kinds("Hon gick hem. Min väg var lång.\n– Jag kommer, sa hon.")).toEqual([
      ["voice", "”min” 1 utanför replikerna, men boken berättas i tredje person."],
    ]);
    expect(kinds("Jag gick hem. Min väg var lång.", { ...deep, voice: "jag" })).toEqual([]);
  });

  it("names the filter words deep POV leaves out, in first person too, but not when it is off", () => {
    expect(kinds("Jag såg att isen sprack.", { ...deep, voice: "jag" })).toHaveLength(1);
    expect(kinds("Hon såg att isen sprack.", { ...deep, deep: false })).toEqual([]);
    expect(kinds("Hon såg att isen sprack. Det verkade kallt.")).toEqual([
      ["filter", "”hon såg att”, ”verkade”. I deep POV visas det direkt i stället."],
    ]);
  });

  it("names a feeling told instead of shown, apart from the filter words", () => {
    expect(kinds("Hon kände sig så ledsen. Han var arg.")).toEqual([
      [
        "feeling",
        "”hon kände sig så ledsen”, ”han var arg”. Visa känslan i kroppen eller i det personen gör.",
      ],
    ]);
  });

  it("notices someone else's thoughts in a chapter seen through one person's eyes", () => {
    expect(kinds("Elin gick ut. Åsa tänkte på vintern.", deep, ["Åsa", "Arvid"])).toEqual([
      ["head", "Åsa tänker eller känner här, fast kapitlet ses genom någon annans ögon."],
    ]);
  });

  it("counts the other tense from three times", () => {
    expect(kinds("Hon är trött. Hon har ont. Isen är tunn.")).toEqual([
      ["tense", "”är” 2, ”har” 1 i berättartexten, men boken skrivs i dåtid."],
    ]);
    expect(kinds("Hon är trött och gick hem.")).toEqual([]);
  });

  it("is quiet until the writer has chosen a way of telling", () => {
    expect(narrationOf({})).toBeNull();
    expect(narrationOf({ narration: { voice: "jag", tense: "nutid", deep: true } })).toEqual({
      voice: "jag",
      tense: "nutid",
      deep: true,
    });
  });

  it("reads close third person as first stored, and keeps deep POV from the omniscient", () => {
    expect(narrationOf({ narration: { voice: "nara", tense: "dåtid" } })).toEqual(deep);
    expect(narrationOf({ narration: { voice: "allvetande", tense: "dåtid", deep: true } })).toEqual(
      { voice: "allvetande", tense: "dåtid", deep: false },
    );
  });
});
