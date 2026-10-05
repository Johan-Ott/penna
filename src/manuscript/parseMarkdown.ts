import type { RootContent } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import type { Node } from "prosemirror-model";
import { splitFootnotes, type FootnoteTexts } from "./footnotes.js";
import { parseInline } from "./parseInline.js";
import { manuscriptSchema as schema, STYLE_NAMES } from "./schema.js";
import { serializeInlineContent } from "./serializeInline.js";
import { findStyleFences, type StyleFence } from "./styleFences.js";

interface PlacedBlock {
  start: number;
  end: number;
  node: Node;
}

export function parseMarkdown(fileMarkdown: string): Node {
  const { body: markdown, notes } = splitFootnotes(fileMarkdown);
  const placed: PlacedBlock[] = [];
  let cursor = 0;
  for (const fence of findStyleFences(markdown)) {
    placed.push(
      ...markdownBlocks(markdown, { from: cursor, to: fence.start }, notes),
      styleBlock(markdown, fence, notes),
    );
    cursor = fence.end;
  }
  placed.push(...markdownBlocks(markdown, { from: cursor, to: markdown.length }, notes));
  const { blocks, trailing } = withGaps(markdown, placed, 0);
  return schema.node("doc", { trailing }, blocks);
}

function withGaps(text: string, placed: PlacedBlock[], rangeStart: number) {
  let previousEnd = rangeStart;
  const blocks = placed.map(({ start, end, node }) => {
    const before = text.slice(previousEnd, start);
    previousEnd = end;
    return node.type.create({ ...node.attrs, before }, node.content);
  });
  return { blocks, trailing: text.slice(previousEnd) };
}

function markdownBlocks(
  text: string,
  range: { from: number; to: number },
  notes: FootnoteTexts,
): PlacedBlock[] {
  const { from, to } = range;
  const chunk = text.slice(from, to);
  return fromMarkdown(chunk).children.map((child) => {
    const start = child.position?.start.offset ?? 0;
    const end = child.position?.end.offset ?? chunk.length;
    return { start: from + start, end: from + end, node: blockFrom(child, chunk, notes) };
  });
}

function blockFrom(child: RootContent, chunk: string, notes: FootnoteTexts): Node {
  const source = chunk.slice(child.position?.start.offset, child.position?.end.offset);
  if (child.type === "thematicBreak") return schema.node("sceneBreak", { source });
  if (child.type !== "paragraph") return schema.node("rawBlock", { source });
  const content = parseInline(child.children, chunk, [], notes);
  const canonical = serializeInlineContent(schema.node("paragraph", null, content));
  return schema.node("paragraph", { source, canonical }, content);
}

function styleBlock(text: string, fence: StyleFence, notes: FootnoteTexts): PlacedBlock {
  const placement = { start: fence.start, end: fence.end };
  const rawFence = () => schema.node("rawBlock", { source: text.slice(fence.start, fence.end) });
  const isKnownStyle = (STYLE_NAMES as readonly string[]).includes(fence.style);
  const inner = markdownBlocks(text, { from: fence.innerStart, to: fence.innerEnd }, notes);
  if (!isKnownStyle || inner.length === 0) return { ...placement, node: rawFence() };
  const { blocks, trailing } = withGaps(text.slice(0, fence.innerEnd), inner, fence.innerStart);
  const attrs = {
    style: fence.style,
    openFence: fence.openFence,
    innerTrailing: trailing,
    closeFence: fence.closeFence,
  };
  return { ...placement, node: schema.node("styleBlock", attrs, blocks) };
}
