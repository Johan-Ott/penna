import { EditorState } from "prosemirror-state";
import { describe, expect, it } from "vitest";
import { findMentions, mentionDecorations } from "../src/editor/mentions";
import { parseMarkdown } from "../src/manuscript/parseMarkdown";
import { mentionPattern } from "../src/project/cards";

const names: [string, string][] = [
  ["01ARVID", "Arvid"],
  ["01ELIN", "Elin"],
  ["01BERG", "Elin Berg"],
];
const matchers = names.map(([id, name]) => ({ id, pattern: mentionPattern(name) }));

describe("findMentions", () => {
  it("finds each name with where it starts and ends", () => {
    const found = findMentions("Arvid såg Elin. Arvids händer.", matchers);

    expect(found).toEqual([
      { id: "01ARVID", from: 0, to: 5 },
      { id: "01ELIN", from: 10, to: 14 },
      { id: "01ARVID", from: 16, to: 22 },
    ]);
  });

  it("lets the longer name win where two cards match the same words", () => {
    const found = findMentions("Elin Berg och Arvid.", matchers);

    expect(found).toEqual([
      { id: "01BERG", from: 0, to: 9 },
      { id: "01ARVID", from: 14, to: 19 },
    ]);
  });
});

describe("mentionDecorations", () => {
  it("marks the names in the document at their positions, across emphasis", () => {
    const state = EditorState.create({
      doc: parseMarkdown("Hon såg *Arvid* vid fyren.\n\n– Elin!\n"),
    });

    const decorations = mentionDecorations(state.doc, matchers).find();

    const marked = decorations.map((decoration) =>
      state.doc.textBetween(decoration.from, decoration.to),
    );
    expect(marked).toEqual(["Arvid", "Elin"]);
  });
});
