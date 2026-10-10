import { describe, expect, it } from "vitest";
import { surfaceNotes } from "../src/manuscript/cliches";
import { dialogueNotes } from "../src/manuscript/dialogue";
import { gestureNotes, similarNames } from "../src/project/bookNotes";
import { CHARACTERS_ID } from "../src/project/tree";

const kinds = (notes: { kind: string; text: string }[]) =>
  notes.map((note) => [note.kind, note.text]);

describe("dialogueNotes", () => {
  it("finds the wrong dash, and dashes mixed with quotation marks", () => {
    const text = "- Hej, sa hon.\n– Hej.\n”Vem där?”";

    expect(kinds(dialogueNotes(text, "sv-SE"))).toEqual([
      ["dash", "1 repliker börjar med fel streck. En svensk replik börjar med –."],
      ["dash", "Både talstreck och citattecken för repliker i scenen. Välj ett av dem."],
    ]);
  });

  it("notices six lines spoken in a row, and a speech verb with an adverb", () => {
    const talk = Array.from({ length: 6 }, (_unused, index) => `– Rad ${index}, sa hon tyst.`);

    expect(dialogueNotes(talk.join("\n"), "sv-SE").map((note) => note.kind)).toEqual([
      "heads",
      "adverb",
    ]);
  });

  it("leaves sa hon att and a scene with action between the lines", () => {
    const text = "– Ja, sa hon att det var så.\nHon gick.\n– Nej.";

    expect(dialogueNotes(text, "sv-SE")).toEqual([]);
  });
});

describe("surfaceNotes", () => {
  it("names a cliché, a wall of text and loud punctuation outside the lines", () => {
    const wall = Array.from({ length: 160 }, () => "ord").join(" ");
    const text = `Tiden stod still. Nej! Aldrig! Inte nu!?\n${wall}`;

    expect(surfaceNotes(text, "sv-SE").map((note) => note.kind)).toEqual([
      "cliche",
      "wall",
      "marks",
    ]);
  });
});

describe("book notes", () => {
  it("counts a gesture that comes back often across the book", () => {
    const scene = `${"Hon log. ".repeat(12)}${"ord ".repeat(500)}`;

    expect(kinds(gestureNotes([scene], "sv-SE"))).toEqual([
      ["gesture", "”log” 12 i boken. Byt några mot vad personen gör just då."],
    ]);
  });

  it("pairs first names a reader can mix up, and leaves names unlike", () => {
    const person = (name: string) => ({ id: name, sortId: CHARACTERS_ID, name });
    const cards = [person("Elin Berg"), person("Ellen"), person("Arvid"), person("Maja")];

    expect(kinds(similarNames(cards))).toEqual([
      ["names", "Elin och Ellen liknar varandra och kan blandas ihop av läsaren."],
    ]);
  });
});
