import type { Node } from "prosemirror-model";
import { countWords } from "../countWords.js";
import { splitFootnotes } from "./footnotes.js";
import { manuscriptSchema as schema, STYLE_NAMES } from "./schema.js";
import { findStyleFences } from "./styleFences.js";

/** Text in raw blocks counts; scene breaks do not. */
export function countDocumentWords(doc: Node): number {
  const leafText = (leaf: Node) =>
    leaf.type === schema.nodes.rawBlock ? `\n${String(leaf.attrs["source"])}\n` : "\n";
  return countWords(doc.textBetween(0, doc.content.size, "\n", leafText));
}

export const countWordsBetween = (doc: Node, from: number, to: number) =>
  countWords(doc.textBetween(from, to, "\n"));

// What Markdown writes around the words: a picture on a line of its own, underline and strike,
// and characters written as entities, such as &amp;.
const PICTURE = /^!\[[^\]]*\]\([^)]*\)[ \t]*$/gm;
const TAG = /<\/?(?:u|s|del|strike)>/g;
const ENTITY = /&(?:[a-z]+|#\d+);/gi;
const FOOTNOTE = /\[\^([^\]\s]+)\]/g;

// A style's fences, when it is one Skrivro knows and it is closed; any other stays text.
function withoutFences(body: string) {
  let text = body;
  for (const fence of findStyleFences(body).reverse()) {
    if (!(STYLE_NAMES as readonly string[]).includes(fence.style)) continue;
    text = `${text.slice(0, fence.start)}${text.slice(fence.innerStart, fence.innerEnd)}${text.slice(fence.end)}`;
  }
  return text;
}

/** The same count as the document's, from a scene file's text without building the document:
 * reading a long book is then many times faster. */
export function countMarkdownWords(markdown: string): number {
  const { body, notes } = splitFootnotes(markdown);
  const text = withoutFences(body)
    .replace(PICTURE, "")
    .replace(TAG, "")
    .replace(ENTITY, "")
    .replace(FOOTNOTE, (marker, label: string) => (notes.has(label) ? " " : marker));
  return countWords(text);
}
