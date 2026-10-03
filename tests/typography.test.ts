import type { EditorState, Transaction } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { describe, expect, it } from "vitest";
import { createEditorState } from "../src/editor/editorState";
import { parseMarkdown } from "../src/manuscript/parseMarkdown";

// Types one character at the end of "Hej-" through the editor's input rules.
function typeAfter(text: string, typed: string, isTypographyOn: boolean) {
  let state: EditorState = createEditorState(parseMarkdown(`${text}\n`), {
    isTypewriterOn: () => false,
    isTypographyOn: () => isTypographyOn,
  });
  const end = state.doc.content.size - 1;
  const view = {
    get state() {
      return state;
    },
    composing: false,
    dispatch: (transaction: Transaction) => (state = state.apply(transaction)),
  } as unknown as EditorView;
  const handled = state.plugins.some((plugin) =>
    plugin.props.handleTextInput?.call(plugin, view, end, end, typed, () => state.tr),
  );
  return handled ? state.doc.textContent : text + typed;
}

describe("Swedish typography while typing", () => {
  it("turns -- into a dash when it is on, and leaves it alone when it is off", () => {
    const texts = [typeAfter("Hej-", "-", true), typeAfter("Hej-", "-", false)];

    expect(texts).toEqual(["Hej–", "Hej--"]);
  });
});
