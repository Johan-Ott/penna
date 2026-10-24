import { EditorState } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { describe, expect, it } from "vitest";
import { autocorrectPlugin, isOneStep } from "../src/editor/autocorrect";
import type { SpellingSwitch } from "../src/editor/spellingMarks";
import { manuscriptSchema as schema } from "../src/manuscript/schema";

describe("isOneStep", () => {
  it("knows a swapped, missing, extra or changed letter", () => {
    expect(isOneStep("ohc", "och")).toBe(true);
    expect(isOneStep("kökt", "köket")).toBe(true);
    expect(isOneStep("brevett", "brevet")).toBe(true);
    expect(isOneStep("brevat", "brevet")).toBe(true);
  });

  it("leaves words two steps apart, or the same word", () => {
    expect(isOneStep("brvt", "brevet")).toBe(false);
    expect(isOneStep("och", "och")).toBe(false);
  });
});

const everythingMisspelled: SpellingSwitch = {
  language: "sv-SE",
  misspelled: async (_language, words) => words,
  suggestions: async () => [],
  addWord: () => undefined,
  isKnown: () => false,
};

const sceneWith = (text: string) =>
  EditorState.create({
    doc: schema.node("doc", null, [schema.node("paragraph", null, text ? schema.text(text) : [])]),
  });

describe("autocorrectPlugin", () => {
  it("lets a third full stop become … in an empty scene without an error", async () => {
    const plugin = autocorrectPlugin(
      () => true,
      () => everythingMisspelled,
    );
    let state = sceneWith("..");
    const dispatched: unknown[] = [];
    const view = {
      get state() {
        return state;
      },
      dispatch: (transaction: unknown) => dispatched.push(transaction),
    };

    plugin.props.handleTextInput?.call(
      plugin,
      view as unknown as EditorView,
      3,
      3,
      ".",
      () => null as never,
    );
    state = sceneWith("…");
    await new Promise((settled) => setTimeout(settled));

    expect(dispatched).toEqual([]);
  });
});
