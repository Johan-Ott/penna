import type { Node } from "prosemirror-model";
import { Plugin, PluginKey, type EditorState } from "prosemirror-state";
import { Decoration, DecorationSet, type EditorView } from "prosemirror-view";

// Word completion on the computer: the rest of a name or a long word from the scene, shown in
// grey after the cursor; Tab takes it, typing on or Esc leaves it.

const LONG_WORD = 7;
const PREFIX = 3;

interface Completion {
  place: number;
  rest: string;
}

const completionKey = new PluginKey<Completion | null>("completion");

// The scene's own long words, counted once per version of the text.
const sceneWords = new WeakMap<Node, string[]>();
function longWordsIn(doc: Node) {
  const known = sceneWords.get(doc);
  if (known) return known;
  const words = [
    ...new Set(doc.textBetween(0, doc.content.size, " ").match(/\p{L}{7,}/gu) ?? []),
  ].filter((word) => word.length >= LONG_WORD);
  sceneWords.set(doc, words);
  return words;
}

/** The rest of the first name or word that begins as the word being typed, or null. */
export function completionFor(prefix: string, words: string[]) {
  if (prefix.length < PREFIX) return null;
  const lower = prefix.toLocaleLowerCase();
  const match = words.find(
    (word) => word.length > prefix.length && word.toLocaleLowerCase().startsWith(lower),
  );
  return match ? match.slice(prefix.length) : null;
}

function completionAt(state: EditorState, names: string[]): Completion | null {
  const { $from, empty } = state.selection;
  if (!empty || !$from.parent.isTextblock) return null;
  const before = $from.parent.textBetween(0, $from.parentOffset, undefined, "￼");
  const after = $from.parent.textBetween($from.parentOffset, $from.parent.content.size);
  const prefix = before.match(/\p{L}+$/u)?.[0] ?? "";
  if (/^\p{L}/u.test(after)) return null;
  const rest = completionFor(prefix, [...names, ...longWordsIn(state.doc)]);
  return rest ? { place: $from.pos, rest } : null;
}

function shownCompletion(state: EditorState) {
  const completion = completionKey.getState(state);
  if (!completion) return null;
  const shown = document.createElement("span");
  shown.className = "completion";
  shown.textContent = completion.rest;
  return DecorationSet.create(state.doc, [Decoration.widget(completion.place, shown, { side: 1 })]);
}

function takeOrLeave(view: EditorView, event: KeyboardEvent) {
  const completion = completionKey.getState(view.state);
  if (!completion) return false;
  if (event.key === "Tab") {
    view.dispatch(view.state.tr.insertText(completion.rest, completion.place));
    return true;
  }
  if (event.key !== "Escape") return false;
  view.dispatch(view.state.tr.setMeta(completionKey, "hide"));
  return true;
}

/** Names are asked each time, so a note made a moment ago is offered at once. */
export function completionPlugin(isOn: () => boolean, names: () => string[]) {
  return new Plugin<Completion | null>({
    key: completionKey,
    state: {
      init: () => null,
      apply: (transaction, _value, _old, state) => {
        if (transaction.getMeta(completionKey) === "hide" || !isOn()) return null;
        return transaction.docChanged ? completionAt(state, names()) : null;
      },
    },
    props: { decorations: shownCompletion, handleKeyDown: takeOrLeave },
  });
}
