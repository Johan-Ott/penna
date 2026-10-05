import type { Node } from "prosemirror-model";

export type FootnoteTexts = Map<string, string>;

// Markdown footnotes: [^1] in the text, "[^1]: Text." on a line of its own at the end.
const DEFINITION = /^\[\^([^\]\s]+)\]:[ \t]?(.*)$/;
export const REFERENCE = /(\[\^[^\]\s]+\])/;

export function splitFootnotes(markdown: string): { body: string; notes: FootnoteTexts } {
  const notes: FootnoteTexts = new Map();
  const kept = markdown.split("\n").filter((line) => {
    const definition = DEFINITION.exec(line);
    if (definition) notes.set(definition[1] ?? "", definition[2] ?? "");
    return !definition;
  });
  if (notes.size === 0) return { body: markdown, notes };
  return { body: `${kept.join("\n").trimEnd()}\n`, notes };
}

export const labelOf = (reference: string) => reference.slice(2, -1);

function footnotesOf(doc: Node) {
  const found: Node[] = [];
  doc.descendants((node) => {
    if (node.type.name === "footnote") found.push(node);
  });
  return found;
}

/** In the order the footnotes appear in the text. */
export function footnoteDefinitions(doc: Node): string {
  const lines = footnotesOf(doc).map(
    (note) => `[^${String(note.attrs["label"])}]: ${String(note.attrs["text"])}`,
  );
  return lines.length === 0 ? "" : `\n${lines.join("\n")}\n`;
}

/** One more than the highest number in the scene. */
export function nextFootnoteLabel(doc: Node): string {
  const numbers = footnotesOf(doc).map((note) => Number(note.attrs["label"]) || 0);
  return String(Math.max(0, ...numbers) + 1);
}
