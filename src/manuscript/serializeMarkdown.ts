import type { Node } from "prosemirror-model";
import { footnoteDefinitions } from "./footnotes.js";
import { serializeInlineContent } from "./serializeInline.js";

export function serializeMarkdown(doc: Node): string {
  return serializeBlocks(doc) + String(doc.attrs["trailing"] ?? "") + footnoteDefinitions(doc);
}

const BLANK_LINE = /\n[ \t]*\r?\n/;
const LINE_BREAK = /\n/;

// A moved block keeps its old gap only while that gap still separates the blocks.
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

// Unchanged paragraphs keep their object identity, so only the edited one is serialized again.
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
