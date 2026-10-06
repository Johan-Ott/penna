import { undo } from "prosemirror-history";
import { TextSelection, type Command, type EditorState } from "prosemirror-state";
import { describe, expect, it } from "vitest";
import { createEditorState, newParagraph } from "../src/editor/editorState";
import { parseMarkdown } from "../src/manuscript/parseMarkdown";

const run = (state: EditorState, command: Command) => {
  let result = state;
  command(state, (transaction) => (result = state.apply(transaction)));
  return result;
};

const typed = (state: EditorState, text: string) => state.apply(state.tr.insertText(text));

describe("undo while writing", () => {
  it("takes back the last paragraph, not everything written without a pause", () => {
    const empty = createEditorState(parseMarkdown(""));
    let state = empty.apply(empty.tr.setSelection(TextSelection.atStart(empty.doc)));
    state = typed(state, "Havet var grått.");
    state = run(state, newParagraph);
    state = typed(state, "Det här ska bort.");

    state = run(state, undo);

    expect(state.doc.textContent).toBe("Havet var grått.");
  });
});
