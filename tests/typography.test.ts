import type { EditorState, Transaction } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { describe, expect, it } from "vitest";
import { createEditorState, DEFAULT_SWITCHES } from "../src/editor/editorState";
import { parseMarkdown } from "../src/manuscript/parseMarkdown";
import { serializeMarkdown } from "../src/manuscript/serializeMarkdown";

// Types one character at the end of the text through the editor's input rules.
function typeInto(text: string, typed: string, isTypographyOn: boolean) {
  let state: EditorState = createEditorState(parseMarkdown(`${text}\n`), {
    ...DEFAULT_SWITCHES,
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
  return { handled, doc: state.doc };
}

function typeAfter(text: string, typed: string, isTypographyOn: boolean) {
  const { handled, doc } = typeInto(text, typed, isTypographyOn);
  return handled ? doc.textContent : text + typed;
}

describe("Swedish typography while typing", () => {
  it("turns -- into a dash when it is on, and leaves it alone when it is off", () => {
    const texts = [typeAfter("Hej-", "-", true), typeAfter("Hej-", "-", false)];

    expect(texts).toEqual(["Hej–", "Hej--"]);
  });
});

describe("a scene break by typing", () => {
  it("turns *** alone on a line into a scene break, with an empty line after it to write on", () => {
    const { doc } = typeInto("Isen bar.\n\n\\*\\*", "*", false);

    expect(serializeMarkdown(doc)).toMatch(/^Isen bar\.\n\n\* \* \*\n/);
    expect(doc.lastChild?.type.name).toBe("paragraph");
  });

  it("leaves three stars inside a sentence alone", () => {
    const { handled } = typeInto("Hon sa \\*\\*", "*", false);

    expect(handled).toBe(false);
  });
});
