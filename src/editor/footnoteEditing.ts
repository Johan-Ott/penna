import type { Node } from "prosemirror-model";
import { NodeSelection, Plugin, type Command } from "prosemirror-state";
import { nextFootnoteLabel } from "../manuscript/footnotes.js";
import { manuscriptSchema as schema } from "../manuscript/schema.js";

export const insertFootnote: Command = (state, dispatch) => {
  if (!state.selection.$to.parent.isTextblock) return false;
  if (!dispatch) return true;
  const after = state.selection.to;
  const note = schema.nodes.footnote.create({ label: nextFootnoteLabel(state.doc), text: "" });
  const transaction = state.tr.insert(after, note);
  dispatch(transaction.setSelection(NodeSelection.create(transaction.doc, after)).scrollIntoView());
  return true;
};

export function selectedFootnote(selection: { from: number; node?: Node }) {
  if (!(selection instanceof NodeSelection) || selection.node.type.name !== "footnote") return null;
  return { position: selection.from, node: selection.node };
}

// A pasted footnote gets a new label, or two footnotes would share one definition.
export const uniqueFootnoteLabels = new Plugin({
  appendTransaction(transactions, _before, state) {
    if (!transactions.some((transaction) => transaction.docChanged)) return null;
    const seen = new Set<string>();
    const transaction = state.tr;
    state.doc.descendants((node, position) => {
      if (node.type.name !== "footnote") return;
      const label = String(node.attrs["label"]);
      if (!seen.has(label)) return void seen.add(label);
      const fresh = nextFootnoteLabel(transaction.doc);
      seen.add(fresh);
      transaction.setNodeMarkup(position, undefined, { ...node.attrs, label: fresh });
    });
    return transaction.docChanged ? transaction : null;
  },
});
