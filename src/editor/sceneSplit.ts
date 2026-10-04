import type { Node } from "prosemirror-model";
import type { Command } from "prosemirror-state";
import { serializeMarkdown } from "../manuscript/serializeMarkdown.js";

/** The text from `pos` to the end, as the body of a new scene file. */
export const textAfter = (doc: Node, pos: number) =>
  serializeMarkdown(doc.cut(pos)).replace(/^\s+/, "");

/** Removes the text from `pos` to the end, which a split has moved to the new scene. */
export const cutAfter =
  (pos: number): Command =>
  (state, dispatch) => {
    dispatch?.(state.tr.delete(pos, state.doc.content.size));
    return true;
  };

/** Adds another scene's blocks after the open scene's, as Slå ihop med nästa does. */
export const appendDoc =
  (other: Node): Command =>
  (state, dispatch) => {
    dispatch?.(state.tr.insert(state.doc.content.size, other.content));
    return true;
  };
