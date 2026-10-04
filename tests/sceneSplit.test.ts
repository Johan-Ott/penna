import { EditorState, TextSelection } from "prosemirror-state";
import { describe, expect, it } from "vitest";
import { appendDoc, cutAfter, textAfter } from "../src/editor/sceneSplit";
import { parseMarkdown } from "../src/manuscript/parseMarkdown";
import { serializeMarkdown } from "../src/manuscript/serializeMarkdown";

const stateAt = (markdown: string, find: string) => {
  const doc = parseMarkdown(markdown);
  let pos = 0;
  doc.descendants((node, position) => {
    const index = node.isText ? (node.text ?? "").indexOf(find) : -1;
    if (index >= 0 && pos === 0) pos = position + index;
  });
  return EditorState.create({ doc, selection: TextSelection.create(doc, pos) });
};

describe("splitting a scene", () => {
  it("takes the text from the cursor to the end as a scene of its own", () => {
    const state = stateAt("Brevet låg där.\n\nHon satte sig. Isen hade lagt sig.\n", "Isen");

    const after = textAfter(state.doc, state.selection.from);
    let kept = state;
    cutAfter(state.selection.from)(state, (transaction) => (kept = state.apply(transaction)));

    expect(after).toBe("Isen hade lagt sig.\n");
    expect(serializeMarkdown(kept.doc)).toBe("Brevet låg där.\n\nHon satte sig.\n");
  });
});

describe("merging scenes", () => {
  it("puts the next scene's paragraphs after the open one's", () => {
    const state = stateAt("Brevet låg där.\n", "Brevet");
    const next = parseMarkdown("Isen bar.\n");

    let merged = state;
    appendDoc(next)(state, (transaction) => (merged = state.apply(transaction)));

    expect(serializeMarkdown(merged.doc)).toBe("Brevet låg där.\n\nIsen bar.\n");
  });
});
