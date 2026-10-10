import { describe, expect, it } from "vitest";
import { proseNotes } from "../src/manuscript/prose";

const long = Array.from({ length: 40 }, (_unused, index) => `ord${index}`).join(" ");

describe("proseNotes", () => {
  it("points at a sentence over 35 words, by its first words", () => {
    const notes = proseNotes(`Kort mening. ${long}.`, "sv-SE");

    expect(notes).toEqual([
      { kind: "long", title: "Lång mening", text: "”ord0 ord1 ord2 ord3 ord4 ord5 …” har 40 ord." },
    ]);
  });

  it("counts a filler word from three times, and every loud speech verb", () => {
    const text = "Det var bara is. Bara is, bara.\n– Nej! utbrast hon. – Gå, väste han. Liksom.";
    const kinds = proseNotes(text, "sv-SE").map((note) => [note.kind, note.text]);

    expect(kinds).toEqual([
      ["filler", "”bara” 3"],
      ["tag", "”utbrast” 1, ”väste” 1. Ett enkelt ”sa” syns minst."],
    ]);
  });

  it("notices three sentences in a row that open with the same word", () => {
    const notes = proseNotes("Hon gick. Hon stannade. Hon vände. Isen sprack.", "sv-SE");

    expect(notes).toEqual([
      { kind: "starts", title: "Samma början", text: "Tre meningar i rad börjar med ”hon”." },
    ]);
  });

  it("knows only the long sentences in a language it has no lists for", () => {
    expect(proseNotes("bara bara bara. utbrast", "fi-FI")).toEqual([]);
  });
});
