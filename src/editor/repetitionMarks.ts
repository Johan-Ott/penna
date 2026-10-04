import type { Node } from "prosemirror-model";
import { Plugin, PluginKey, type Command } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { repetitions, wordsWithSentences } from "../manuscript/review.js";
import { documentText } from "./documentText.js";

const found = (doc: Node, window: number) => {
  const { text, toDoc } = documentText(doc);
  return repetitions(wordsWithSentences(text), window).map((repetition) => ({
    word: repetition.word,
    ranges: repetition.ranges.map((range) => ({ from: toDoc(range.from), to: toDoc(range.to) })),
  }));
};

/** The repeated words of a scene, each once, for the review panel. */
export const sceneRepetitions = (doc: Node, window: number) =>
  found(doc, window).map((repetition) => ({
    word: repetition.word,
    count: repetition.ranges.length,
  }));

export function repetitionDecorations(doc: Node, window: number): DecorationSet {
  const decorations = found(doc, window).flatMap((repetition) =>
    repetition.ranges.map((range) => Decoration.inline(range.from, range.to, { class: "repeat" })),
  );
  return DecorationSet.create(doc, decorations);
}

const repetitionsKey = new PluginKey<DecorationSet>("repetitions");

/** Run after the review setting or its window changes. */
export const refreshRepetitions: Command = (state, dispatch) => {
  dispatch?.(state.tr.setMeta(repetitionsKey, true));
  return true;
};

/** Dots under words used again too soon. `window` is asked on each change; null turns it off. */
export function repetitionsPlugin(window: () => number | null) {
  const decorate = (doc: Node) => {
    const sentences = window();
    return sentences === null ? DecorationSet.empty : repetitionDecorations(doc, sentences);
  };
  return new Plugin<DecorationSet>({
    key: repetitionsKey,
    state: {
      init: (_config, state) => decorate(state.doc),
      apply: (transaction, old, _oldState, state) =>
        transaction.docChanged || transaction.getMeta(repetitionsKey) ? decorate(state.doc) : old,
    },
    props: { decorations: (state) => repetitionsKey.getState(state) },
  });
}
