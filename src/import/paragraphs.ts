import type { Mark, Node } from "prosemirror-model";
import { manuscriptSchema as schema } from "../manuscript/schema.js";
import { serializeInlineContent } from "../manuscript/serializeInline.js";

export interface Block {
  /** 1 to 6 for a heading, 0 for a paragraph. */
  heading: number;
  inline: Node[];
}

export interface BlockReader {
  blocks: Block[];
  block: Block;
  marks: readonly Mark[];
}

const SCENE_BREAK = /^\s*(\*\s*){3,}$|^\s*#\s*$/;

export const newBlockReader = (): BlockReader => ({
  blocks: [],
  block: { heading: 0, inline: [] },
  marks: [],
});

export function addText(reader: BlockReader, text: string) {
  if (text !== "") reader.block.inline.push(schema.text(text, reader.marks));
}

export const addLineBreak = (reader: BlockReader) =>
  reader.block.inline.push(schema.node("lineBreak"));

export function endBlock(reader: BlockReader) {
  reader.blocks.push(reader.block);
  reader.block = { heading: 0, inline: [] };
}

export function setMark(reader: BlockReader, name: string, isOn: boolean) {
  const mark = schema.mark(name);
  reader.marks = isOn ? mark.addToSet(reader.marks) : mark.removeFromSet(reader.marks);
}

function blockMarkdown(block: Block): string {
  const paragraph = schema.node("paragraph", null, block.inline);
  if (block.heading > 0) return `${"#".repeat(block.heading)} ${paragraph.textContent.trim()}`;
  if (SCENE_BREAK.test(paragraph.textContent)) return "***";
  return serializeInlineContent(paragraph).trim();
}

/** Escaped by the same code that saves a scene. */
export function blocksToMarkdown(reader: BlockReader): string {
  endBlock(reader);
  const lines = reader.blocks.map(blockMarkdown).filter((line) => line !== "");
  return lines.length > 0 ? `${lines.join("\n\n")}\n` : "";
}
