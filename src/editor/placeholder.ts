import { Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

export function placeholder(text: string) {
  return new Plugin({
    props: {
      decorations(state) {
        const { doc } = state;
        const first = doc.firstChild;
        const isEmpty = doc.childCount === 1 && first?.isTextblock && first.content.size === 0;
        if (!isEmpty) return null;
        const decoration = Decoration.node(0, first.nodeSize, {
          class: "empty-scene",
          "data-placeholder": text,
        });
        return DecorationSet.create(doc, [decoration]);
      },
    },
  });
}
