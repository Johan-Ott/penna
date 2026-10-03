import type { Node } from "prosemirror-model";
import { serializeInlineContent } from "./serializeInline.js";

export { serializeInlineContent };

export function serializeMarkdown(doc: Node): string {
  return serializeBlocks(doc) + String(doc.attrs["trailing"] ?? "");
}

const BLANK_LINE = /\n[ \t]*\r?\n/;
const LINE_BREAK = /\n/;

// A block that was moved, lifted or pasted carries the gap from where it came from. The gap is
// kept only while it still separates the blocks; text after a paragraph needs a blank line.
function gapBefore(block: Node, previous: Node | null): string {
  const before = block.attrs["before"] as string | null;
  if (!previous) return before ?? "";
  const needsBlankLine = previous.type.name === "paragraph" || previous.type.name === "styleBlock";
  const isValid = before !== null && (needsBlankLine ? BLANK_LINE : LINE_BREAK).test(before);
  return isValid ? before : "\n\n";
}

function serializeBlocks(parent: Node): string {
  let markdown = "";
  let previous: Node | null = null;
  parent.forEach((block) => {
    markdown += gapBefore(block, previous) + serializeBlock(block);
    previous = block;
  });
  return markdown;
}

function serializeBlock(block: Node): string {
  const source = block.attrs["source"] as string | null;
  if (block.type.name === "rawBlock") return source ?? "";
  if (block.type.name === "sceneBreak") return source ?? "* * *";
  if (block.type.name === "styleBlock") return serializeStyleBlock(block);
  const canonical = cachedCanonical(block);
  return source !== null && canonical === block.attrs["canonical"] ? source : canonical;
}

// ProseMirror keeps unchanged paragraphs as the same objects, so after a keystroke only the
// edited paragraph is serialized again.
const canonicalByParagraph = new WeakMap<Node, string>();

function cachedCanonical(paragraph: Node): string {
  const cached = canonicalByParagraph.get(paragraph);
  if (cached !== undefined) return cached;
  const canonical = serializeInlineContent(paragraph);
  canonicalByParagraph.set(paragraph, canonical);
  return canonical;
}

function serializeStyleBlock(block: Node): string {
  const style = String(block.attrs["style"]);
  const openFence = block.attrs["openFence"] as string | null;
  const fenceStyle = openFence?.replace(/^:::/, "").trim();
  const open = openFence !== null && fenceStyle === style ? openFence : `::: ${style}\n`;
  const innerTrailing = (block.attrs["innerTrailing"] as string | null) ?? "\n";
  const close = (block.attrs["closeFence"] as string | null) ?? ":::";
  return open + serializeBlocks(block) + innerTrailing + close;
}
