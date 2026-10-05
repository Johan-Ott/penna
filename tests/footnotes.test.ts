import type { Node } from "prosemirror-model";
import { EditorState, TextSelection } from "prosemirror-state";
import { describe, expect, it } from "vitest";
import {
  insertFootnote,
  selectedFootnote,
  uniqueFootnoteLabels,
} from "../src/editor/footnoteEditing";
import { parseMarkdown } from "../src/manuscript/parseMarkdown";
import { serializeMarkdown } from "../src/manuscript/serializeMarkdown";
import { countDocumentWords } from "../src/manuscript/wordCount";

const SCENE = "Fyren byggdes 1872[^1] på udden.\n\n[^1]: Enligt sjökortet från 1901.\n";

function footnotesIn(doc: Node) {
  const found: { label: string; text: string }[] = [];
  doc.descendants((node) => {
    if (node.type.name === "footnote") {
      found.push({ label: String(node.attrs["label"]), text: String(node.attrs["text"]) });
    }
  });
  return found;
}

describe("footnotes in a scene file", () => {
  it("reads a reference and its definition as one footnote in the text", () => {
    const doc = parseMarkdown(SCENE);

    expect(footnotesIn(doc)).toEqual([{ label: "1", text: "Enligt sjökortet från 1901." }]);
    expect(doc.textContent).toBe("Fyren byggdes 1872 på udden.");
  });

  it("saves an unchanged scene with footnotes byte for byte", () => {
    expect(serializeMarkdown(parseMarkdown(SCENE))).toBe(SCENE);
  });

  it("writes a changed footnote's text at the end of the file", () => {
    const doc = parseMarkdown(SCENE);
    let position = 0;
    doc.descendants((node, place) => {
      if (node.type.name === "footnote") position = place;
    });

    const changed = EditorState.create({ doc }).tr.setNodeMarkup(position, undefined, {
      label: "1",
      text: "Ny källa.",
    }).doc;

    expect(serializeMarkdown(changed)).toBe(
      "Fyren byggdes 1872[^1] på udden.\n\n[^1]: Ny källa.\n",
    );
  });

  it("leaves a reference without a definition as text", () => {
    const doc = parseMarkdown("Text[^9] utan not.\n");

    expect(footnotesIn(doc)).toEqual([]);
    expect(serializeMarkdown(doc)).toBe("Text[^9] utan not.\n");
  });

  it("does not count a footnote's words as the scene's", () => {
    expect(countDocumentWords(parseMarkdown(SCENE))).toBe(5);
  });
});

describe("footnote editing", () => {
  it("puts a new footnote after the selection, with the next free label, and selects it", () => {
    const doc = parseMarkdown(SCENE);
    const state = EditorState.create({ doc, plugins: [uniqueFootnoteLabels] });
    const end = TextSelection.create(doc, doc.content.size - 1);
    let next = state.apply(state.tr.setSelection(end));

    insertFootnote(next, (transaction) => (next = next.apply(transaction)));

    expect(footnotesIn(next.doc).map((note) => note.label)).toEqual(["1", "2"]);
    expect(selectedFootnote(next.selection)?.node.attrs["label"]).toBe("2");
  });

  it("gives a pasted footnote a new label when the scene already has its label", () => {
    const doc = parseMarkdown(SCENE);
    const state = EditorState.create({ doc, plugins: [uniqueFootnoteLabels] });
    const copy = doc.type.schema.nodes.footnote?.create({ label: "1", text: "Kopia." });

    const pasted = copy ? state.apply(state.tr.insert(doc.content.size - 1, copy)) : state;

    expect(footnotesIn(pasted.doc).map((note) => note.label)).toEqual(["1", "2"]);
  });
});
