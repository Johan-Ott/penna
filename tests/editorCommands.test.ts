import { EditorState, TextSelection } from "prosemirror-state";
import { describe, expect, it } from "vitest";
import {
  clearFormatting,
  insertLineBreak,
  isMarkActive,
  insertSceneBreak,
  currentStyle,
  setStyle,
  toggleBold,
  toggleItalic,
  toggleQuote,
} from "../src/editor/commands";
import { parseMarkdown } from "../src/manuscript/parseMarkdown";
import { serializeMarkdown } from "../src/manuscript/serializeMarkdown";

function stateAt(markdown: string, from: number, to = from) {
  const doc = parseMarkdown(markdown);
  const state = EditorState.create({ doc });
  return state.apply(state.tr.setSelection(TextSelection.create(doc, from, to)));
}

function run(state: EditorState, command: typeof toggleBold) {
  let result = state;
  command(state, (transaction) => (result = state.apply(transaction)));
  return result;
}

const markdownOf = (state: EditorState) => serializeMarkdown(state.doc);

describe("formatting commands", () => {
  it("makes the selected word bold", () => {
    const state = stateAt("Brevet låg där.\n", 8, 11);

    const after = run(state, toggleBold);

    expect(markdownOf(after)).toBe("Brevet **låg** där.\n");
  });

  it("makes the selected word italic", () => {
    const state = stateAt("Brevet låg där.\n", 8, 11);

    const after = run(state, toggleItalic);

    expect(markdownOf(after)).toBe("Brevet *låg* där.\n");
  });

  it("inserts a line break inside the paragraph", () => {
    const state = stateAt("Kära Elin.Din Henrik\n", 11);

    const after = run(state, insertLineBreak);

    expect(markdownOf(after)).toBe("Kära Elin.\nDin Henrik\n");
  });
});

describe("insertSceneBreak", () => {
  it("splits the paragraph and puts a scene break between the halves", () => {
    const state = stateAt("Före. Efter.\n", 7);

    const after = run(state, insertSceneBreak);

    expect(markdownOf(after)).toBe("Före.\n\n* * *\n\nEfter.\n");
  });

  it("leaves the cursor in a paragraph after the break, ready to write", () => {
    const state = stateAt("Slut på scenen.\n", 16);

    const after = run(state, insertSceneBreak);

    expect(after.selection.$from.parent.type.name).toBe("paragraph");
    expect(after.doc.lastChild?.type.name).toBe("paragraph");
  });
});

describe("setStyle", () => {
  it("wraps the paragraph in a letter", () => {
    const state = stateAt("Kära Elin.\n", 3);

    const after = run(state, setStyle("brev"));

    expect(markdownOf(after)).toBe("::: brev\nKära Elin.\n:::\n");
    expect(currentStyle(after)).toBe("brev");
  });

  it("changes a letter into a quote", () => {
    const state = stateAt("::: brev\nKära Elin.\n:::\n", 3);

    const after = run(state, setStyle("citat"));

    expect(markdownOf(after)).toBe("::: citat\nKära Elin.\n:::\n");
  });

  it("turns a letter back into body text", () => {
    const state = stateAt("Före.\n\n::: brev\nKära Elin.\n:::\n", 10);

    const after = run(state, setStyle("brodtext"));

    expect(markdownOf(after)).toBe("Före.\n\nKära Elin.\n");
    expect(currentStyle(after)).toBe("brodtext");
  });
});

describe("isMarkActive", () => {
  it("tells whether the selection is bold", () => {
    const state = stateAt("Brevet **låg** där.\n", 8, 11);

    const bold = isMarkActive(state, "bold");
    const italic = isMarkActive(state, "italic");

    expect(bold).toBe(true);
    expect(italic).toBe(false);
  });
});

describe("toggleQuote", () => {
  it("turns a paragraph into a quote and back", () => {
    const state = stateAt("Kära Elin.\n", 3);

    const quoted = run(state, toggleQuote);
    const unquoted = run(quoted, toggleQuote);

    expect(markdownOf(quoted)).toBe("::: citat\nKära Elin.\n:::\n");
    expect(markdownOf(unquoted)).toBe("Kära Elin.\n");
  });
});

describe("clearFormatting", () => {
  it("removes bold and italic from the selection and keeps the style", () => {
    const state = stateAt("::: brev\nEtt **fett** och *kursivt* ord.\n:::\n", 2, 27);

    const cleared = run(state, clearFormatting);

    expect(markdownOf(cleared)).toBe("::: brev\nEtt fett och kursivt ord.\n:::\n");
  });
});
