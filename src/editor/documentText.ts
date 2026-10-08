import type { Node } from "prosemirror-model";

// A leaf such as a line break counts as one character, so text offsets are document offsets.
export const LEAF = "￼";

interface Block {
  textStart: number;
  docStart: number;
  length: number;
}

/** Repetitions and comments are found in this text and mapped back to document positions. */
export function documentText(doc: Node) {
  let text = "";
  const blocks: Block[] = [];
  doc.descendants((node, position) => {
    if (!node.isTextblock) return true;
    const blockText = node.textBetween(0, node.content.size, undefined, LEAF);
    blocks.push({ textStart: text.length, docStart: position + 1, length: blockText.length });
    text += `${blockText}\n`;
    return false;
  });
  const toDoc = (offset: number) => {
    const block = [...blocks].reverse().find((candidate) => candidate.textStart <= offset);
    return block ? block.docStart + offset - block.textStart : offset;
  };
  const fromDoc = (position: number) => {
    const block = blocks.find((candidate) => position <= candidate.docStart + candidate.length);
    return block ? block.textStart + Math.max(0, position - block.docStart) : text.length;
  };
  return { text, toDoc, fromDoc };
}

/** The paragraph's text just before a position, to find the place again in the text read anew. */
export function textBefore(doc: Node, position: number, length = 40) {
  const { text, fromDoc } = documentText(doc);
  const offset = fromDoc(position);
  return (
    text
      .slice(Math.max(0, offset - length), offset)
      .split("\n")
      .pop() ?? ""
  );
}

/** Where `before` ends, the occurrence nearest the old position; the old position if it is gone. */
export function positionAfter(doc: Node, before: string, oldPosition: number) {
  if (!before) return oldPosition;
  const { text, toDoc, fromDoc } = documentText(doc);
  const near = fromDoc(Math.min(oldPosition, doc.content.size));
  let best = -1;
  for (let start = text.indexOf(before); start !== -1; start = text.indexOf(before, start + 1)) {
    if (best < 0 || Math.abs(start - near) < Math.abs(best - near)) best = start;
  }
  return best < 0 ? oldPosition : toDoc(best + before.length);
}
