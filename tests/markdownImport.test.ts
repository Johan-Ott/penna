import { describe, expect, it } from "vitest";
import { splitManuscript, type ImportedNode } from "../src/import/markdownImport";

// The shape of the book, with each scene's title and its first words.
const shape = (nodes: ImportedNode[]): unknown[] =>
  nodes.map((node) =>
    node.kind === "scene"
      ? `${node.title}: ${node.body.slice(0, 12).trim()}`
      : { [`${node.kind} ${node.title}`]: shape(node.children) },
  );

describe("splitManuscript", () => {
  it("makes chapters of the headings and scenes of the scene breaks", () => {
    const text =
      "# Brevet\n\nBrevet låg där.\n\n***\n\nIsen bar.\n\n# Fyren\n\nLjuset gick runt.\n";

    const book = splitManuscript(text);

    expect(shape(book)).toEqual([
      { "chapter Brevet": ["Brevet låg där: Brevet låg d", "Isen bar: Isen bar."] },
      { "chapter Fyren": ["Ljuset gick runt: Ljuset gick"] },
    ]);
  });

  it("makes parts of the top headings when there are two levels, and scene titles of a third", () => {
    const text =
      "# Vintern\n\n## Brevet\n\n### Köket\n\nBrevet låg där.\n\n### Isen\n\nIsen bar.\n";

    const book = splitManuscript(text);

    expect(shape(book)).toEqual([
      { "part Vintern": [{ "chapter Brevet": ["Köket: Brevet låg d", "Isen: Isen bar."] }] },
    ]);
  });

  it("keeps text before the first heading as scenes of their own, first in the book", () => {
    const text = "Till Henrik.\n\n# Brevet\n\nBrevet låg där.\n";

    const book = splitManuscript(text);

    expect(shape(book)).toEqual([
      "Till Henrik: Till Henrik.",
      { "chapter Brevet": ["Brevet låg där: Brevet låg d"] },
    ]);
  });

  it("finds chapters in plain text by lines like Kapitel 3, and keeps emphasis in the scenes", () => {
    const text = "KAPITEL 1\n\nHon läste *brevet* igen.\n\nKapitel 2: Fyren\n\nLjuset gick runt.\n";

    const book = splitManuscript(text);

    expect(shape(book)).toEqual([
      { "chapter KAPITEL 1": ["Hon läste brevet igen: Hon läste *b"] },
      { "chapter Fyren": ["Ljuset gick runt: Ljuset gick"] },
    ]);
  });

  it("names a scene by its first words, without markdown marks, at most six of them", () => {
    const book = splitManuscript("*Kära Elin*, om du läser det här har isen till slut släppt.\n");

    expect(book[0]?.title).toBe("Kära Elin om du läser det");
  });
});
