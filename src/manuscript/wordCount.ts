import type { Node } from "prosemirror-model";
import { countWords } from "../countWords.js";
import { manuscriptSchema as schema } from "./schema.js";

/** Words as the writer sees them: text in raw blocks counts, scene breaks do not. */
export function countDocumentWords(doc: Node): number {
  const leafText = (leaf: Node) =>
    leaf.type === schema.nodes.rawBlock ? `\n${String(leaf.attrs["source"])}\n` : "\n";
  return countWords(doc.textBetween(0, doc.content.size, "\n", leafText));
}

/** Words between two positions, as the selection bar shows them for marked text. */
export const countWordsBetween = (doc: Node, from: number, to: number) =>
  countWords(doc.textBetween(from, to, "\n"));
