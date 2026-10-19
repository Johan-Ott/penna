import type { Node } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { revisionChanges } from "../manuscript/revision.js";
import { documentText } from "./documentText.js";

// In Förslagsläge the editor holds the suggestion, so it is compared the other way round: what
// the scene lacks is written here, what it has that is gone is shown struck through.

const removedText = (text: string) => {
  const shown = document.createElement("span");
  shown.className = "suggestion-removed";
  shown.textContent = text.replace(/\n+/g, " ¶ ");
  return shown;
};

function suggestionDecorations(doc: Node, sceneText: string | null): DecorationSet {
  if (sceneText === null) return DecorationSet.empty;
  const { text, toDoc } = documentText(doc);
  const decorations = revisionChanges(text, sceneText).flatMap((change) => {
    const from = toDoc(change.from);
    const to = toDoc(change.to);
    return [
      ...(to > from ? [Decoration.inline(from, to, { class: "suggestion-added" })] : []),
      ...(change.added
        ? [Decoration.widget(from, () => removedText(change.added), { side: -1 })]
        : []),
    ];
  });
  return DecorationSet.create(doc, decorations);
}

const suggestionKey = new PluginKey<DecorationSet>("suggestion");
// Compared again once the writer pauses, as a whole scene is too long to compare at every key.
const PAUSE_MS = 300;

/** `sceneText`: the scene as it was when Förslagsläge began, or null when it is off. */
export function suggestionPlugin(sceneText: () => string | null) {
  return new Plugin<DecorationSet>({
    key: suggestionKey,
    state: {
      init: (_config, state) => suggestionDecorations(state.doc, sceneText()),
      apply: (transaction, old, _oldState, state) =>
        transaction.getMeta(suggestionKey)
          ? suggestionDecorations(state.doc, sceneText())
          : old.map(transaction.mapping, transaction.doc),
    },
    props: { decorations: (state) => suggestionKey.getState(state) },
    view: () => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      return {
        update: (view, before) => {
          if (view.state.doc.eq(before.doc) || sceneText() === null) return;
          clearTimeout(timer);
          timer = setTimeout(
            () => view.dispatch(view.state.tr.setMeta(suggestionKey, true)),
            PAUSE_MS,
          );
        },
        destroy: () => clearTimeout(timer),
      };
    },
  });
}
