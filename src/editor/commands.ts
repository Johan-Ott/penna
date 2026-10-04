import { toggleMark } from "prosemirror-commands";
import type { Node, ResolvedPos } from "prosemirror-model";
import { TextSelection, type Command, type EditorState } from "prosemirror-state";
import { findWrapping, liftTarget } from "prosemirror-transform";
import { manuscriptSchema as schema, type StyleName } from "../manuscript/schema.js";
import { t } from "../i18n/i18n.js";

export type StyleChoice = StyleName | "brodtext";

export const STYLE_LABELS: Record<StyleChoice, string> = {
  brodtext: t("Brödtext"),
  brev: t("Brev"),
  citat: t("Citat"),
  dikt: t("Dikt"),
  meddelande: t("Meddelande"),
};

export const toggleBold = toggleMark(schema.marks.bold);
export const toggleItalic = toggleMark(schema.marks.italic);

export const insertLineBreak: Command = (state, dispatch) => {
  dispatch?.(state.tr.replaceSelectionWith(schema.nodes.lineBreak.create()).scrollIntoView());
  return true;
};

export const insertSceneBreak: Command = (state, dispatch) => {
  const { $from } = state.selection;
  if (!$from.parent.isTextblock) return false;
  if (!dispatch) return true;
  const sceneBreak = schema.nodes.sceneBreak.create();
  if ($from.parentOffset === 0 && $from.parent.content.size > 0) {
    dispatch(state.tr.insert($from.before(), sceneBreak).scrollIntoView());
    return true;
  }
  const transaction = state.tr.deleteSelection();
  const splitAt = transaction.selection.from;
  transaction.split(splitAt).insert(splitAt + 1, sceneBreak);
  transaction.setSelection(TextSelection.create(transaction.doc, splitAt + 3));
  dispatch(transaction.scrollIntoView());
  return true;
};

function styleBlockAround($pos: ResolvedPos): { node: Node; pos: number } | null {
  for (let depth = $pos.depth; depth > 0; depth--) {
    const node = $pos.node(depth);
    if (node.type === schema.nodes.styleBlock) return { node, pos: $pos.before(depth) };
  }
  return null;
}

export function currentStyle(state: EditorState): StyleChoice {
  const container = styleBlockAround(state.selection.$from);
  return container ? (container.node.attrs["style"] as StyleName) : "brodtext";
}

const changeStyle =
  (style: StyleName, container: { node: Node; pos: number }): Command =>
  (state, dispatch) => {
    const attrs = { ...container.node.attrs, style };
    dispatch?.(state.tr.setNodeMarkup(container.pos, undefined, attrs));
    return true;
  };

const liftOutOfStyle: Command = (state, dispatch) => {
  const range = state.selection.$from.blockRange(state.selection.$to);
  const target = range && liftTarget(range);
  if (!range || target === null || target === undefined) return false;
  dispatch?.(state.tr.lift(range, target));
  return true;
};

const wrapInStyle =
  (style: StyleName): Command =>
  (state, dispatch) => {
    const range = state.selection.$from.blockRange(state.selection.$to);
    const wrapping = range && findWrapping(range, schema.nodes.styleBlock, { style });
    if (!range || !wrapping) return false;
    dispatch?.(state.tr.wrap(range, wrapping));
    return true;
  };

export function setStyle(style: StyleChoice): Command {
  return (state, dispatch) => {
    const container = styleBlockAround(state.selection.$from);
    if (style === "brodtext") return container ? liftOutOfStyle(state, dispatch) : true;
    if (container) return changeStyle(style, container)(state, dispatch);
    return wrapInStyle(style)(state, dispatch);
  };
}

export function isMarkActive(state: EditorState, markName: "bold" | "italic"): boolean {
  const markType = schema.marks[markName];
  const { from, to, empty, $from } = state.selection;
  if (empty) return Boolean(markType.isInSet(state.storedMarks ?? $from.marks()));
  return state.doc.rangeHasMark(from, to, markType);
}

/** The quote button in the toolbar: turns the paragraph into a quote, or back into body text. */
export const toggleQuote: Command = (state, dispatch) =>
  setStyle(currentStyle(state) === "citat" ? "brodtext" : "citat")(state, dispatch);

/** Removes bold and italic. Styles say what the text is, so they stay. */
export const clearFormatting: Command = (state, dispatch) => {
  const { from, to } = state.selection;
  const transaction = state.tr
    .removeMark(from, to, schema.marks.bold)
    .removeMark(from, to, schema.marks.italic)
    .setStoredMarks([]);
  dispatch?.(transaction);
  return true;
};
