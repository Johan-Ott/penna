import type { Node } from "prosemirror-model";
import type { Command } from "prosemirror-state";
import { serializeMarkdown } from "../manuscript/serializeMarkdown.js";

export const textAfter = (doc: Node, pos: number) =>
  serializeMarkdown(doc.cut(pos)).replace(/^\s+/, "");

export const cutAfter =
  (pos: number): Command =>
  (state, dispatch) => {
    dispatch?.(state.tr.delete(pos, state.doc.content.size));
    return true;
  };

export const appendDoc =
  (other: Node): Command =>
  (state, dispatch) => {
    dispatch?.(state.tr.insert(state.doc.content.size, other.content));
    return true;
  };
