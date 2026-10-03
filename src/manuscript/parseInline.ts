import type { PhrasingContent } from "mdast";
import type { Mark, Node } from "prosemirror-model";
import { manuscriptSchema as schema } from "./schema.js";

const LINE_BREAK = /\r?\n/;

function textWithBreaks(text: string, marks: readonly Mark[]): Node[] {
  return text.split(LINE_BREAK).flatMap((line, index) => {
    const nodes: Node[] = index > 0 ? [schema.node("lineBreak")] : [];
    if (line !== "") nodes.push(schema.text(line, marks));
    return nodes;
  });
}

function sourceOf(node: PhrasingContent, source: string): string {
  const start = node.position?.start.offset ?? 0;
  const end = node.position?.end.offset ?? start;
  return source.slice(start, end);
}

/** Inline content Penna does not edit (links, code, html) is kept as raw text. */
export function parseInline(
  children: PhrasingContent[],
  source: string,
  marks: readonly Mark[] = [],
): Node[] {
  return children.flatMap((child) => {
    if (child.type === "text") return textWithBreaks(child.value, marks);
    if (child.type === "break") return [schema.node("lineBreak")];
    if (child.type === "emphasis" || child.type === "strong") {
      const markName = child.type === "emphasis" ? "italic" : "bold";
      return parseInline(child.children, source, schema.mark(markName).addToSet(marks));
    }
    return textWithBreaks(sourceOf(child, source), schema.mark("raw").addToSet(marks));
  });
}
