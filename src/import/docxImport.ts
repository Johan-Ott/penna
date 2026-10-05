import mammoth from "mammoth";
import {
  addLineBreak,
  addText,
  blocksToMarkdown,
  endBlock,
  newBlockReader,
  setMark,
  type BlockReader,
} from "./paragraphs.js";

// Mammoth writes simple, well-formed HTML: a tag or a run of text at a time.
const TOKEN = /<(\/?)([a-z0-9]+)[^>]*>|([^<]+)/g;
const BLOCK_TAGS = /^(p|li|td|h[1-6])$/;
const MARKS = new Map([
  ["em", "italic"],
  ["i", "italic"],
  ["strong", "bold"],
  ["b", "bold"],
]);
const ENTITIES = new Map([
  ["amp", "&"],
  ["lt", "<"],
  ["gt", ">"],
  ["quot", '"'],
  ["#39", "'"],
]);
const decode = (text: string) =>
  text.replace(/&(amp|lt|gt|quot|#39);/g, (_all, name: string) => ENTITIES.get(name) ?? "");

function readTag(reader: BlockReader, tag: string, isClosing: boolean) {
  const mark = MARKS.get(tag);
  if (tag === "br") addLineBreak(reader);
  else if (mark) setMark(reader, mark, !isClosing);
  else if (!BLOCK_TAGS.test(tag)) return;
  else if (isClosing) endBlock(reader);
  else reader.block.heading = tag.startsWith("h") ? Number(tag.slice(1)) : 0;
}

export function htmlToMarkdown(html: string): string {
  const reader = newBlockReader();
  for (const [, closing, tag = "", text] of html.matchAll(TOKEN)) {
    if (text) addText(reader, decode(text));
    else readTag(reader, tag, closing === "/");
  }
  return blocksToMarkdown(reader);
}

export async function docxToMarkdown(bytes: Uint8Array): Promise<string> {
  const arrayBuffer = bytes.slice().buffer;
  // Mammoth reads `buffer` in Node and `arrayBuffer` in the browser build.
  const input = { arrayBuffer, buffer: arrayBuffer as unknown as Buffer };
  return htmlToMarkdown((await mammoth.convertToHtml(input)).value);
}
