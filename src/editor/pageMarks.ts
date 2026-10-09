import type { Node } from "prosemirror-model";
import { Plugin, PluginKey, type Command } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

// A dashed line between blocks, with the page number at its right end. On a sheet the page that
// ends is numbered at its foot instead, from data-ending.
function pageMark(page: number, ending: number | undefined) {
  const mark = document.createElement("div");
  mark.className = "page-mark";
  if (ending !== undefined) mark.dataset["ending"] = String(ending);
  mark.contentEditable = "false";
  const label = document.createElement("span");
  label.className = "page-mark-label";
  label.textContent = `s. ${page}`;
  mark.append(label);
  return mark;
}

/** A mark at each top-level block where a new printed page has begun since the block before. */
export function pageDecorations(doc: Node, pages: (number | undefined)[]) {
  const decorations: Decoration[] = [];
  let previous: number | undefined;
  doc.forEach((_block, offset, index) => {
    const page = pages[index];
    const ending = previous;
    if (page !== undefined && page !== previous) {
      decorations.push(
        Decoration.widget(offset, () => pageMark(page, ending), { side: -1, key: `p${page}` }),
      );
    }
    if (page !== undefined) previous = page;
  });
  return DecorationSet.create(doc, decorations);
}

const pageMarksKey = new PluginKey<DecorationSet>("pageMarks");

export const refreshPageMarks: Command = (state, dispatch) => {
  dispatch?.(state.tr.setMeta(pageMarksKey, true));
  return true;
};

/** `pages` gives the printed page of each top-level block of the open scene, or null for none. */
export function pageMarksPlugin(pages: () => (number | undefined)[] | null) {
  const decorate = (doc: Node) => {
    const known = pages();
    return known ? pageDecorations(doc, known) : DecorationSet.empty;
  };
  return new Plugin<DecorationSet>({
    key: pageMarksKey,
    state: {
      init: (_config, state) => decorate(state.doc),
      apply: (transaction, old, _oldState, state) =>
        transaction.getMeta(pageMarksKey)
          ? decorate(state.doc)
          : old.map(transaction.mapping, state.doc),
    },
    props: { decorations: (state) => pageMarksKey.getState(state) },
  });
}
