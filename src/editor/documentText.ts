import type { Node } from "prosemirror-model";

// A leaf such as a line break counts as one character, so text offsets are document offsets.
const LEAF = "￼";

interface Block {
  textStart: number;
  docStart: number;
  length: number;
}

/**
 * The document as one text, a line per paragraph, with ways between text offsets and document
 * positions. Repetitions and comments are found in the text and marked in the document.
 */
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
