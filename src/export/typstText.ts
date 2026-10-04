import type { Node } from "prosemirror-model";
import { quoteConverter, type Typography } from "./book.js";

/** Prose as Typst markup: every character Typst could read as code is escaped. */
export const escapeTypst = (text: string) => text.replace(/[\\#*_`$<>@[\]~=\-+/"':({]/g, "\\$&");

/** Text inside a Typst string literal, as in `"Vintervägen"`. */
export const typstString = (text: string) =>
  `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

function inline(paragraph: Node, convert: (text: string) => string) {
  let markup = "";
  paragraph.forEach((child) => {
    if (child.type.name === "lineBreak") return void (markup += " \\\n");
    let text = escapeTypst(convert(child.text ?? ""));
    const marks = new Set(child.marks.map((mark) => mark.type.name));
    if (marks.has("italic")) text = `#emph[${text}]`;
    if (marks.has("bold")) text = `#strong[${text}]`;
    markup += text;
  });
  return markup;
}

// The chapter's first letter, set large; the rest of the paragraph follows it.
function withDropCap(markup: string) {
  const match = /^(\p{L})/u.exec(markup);
  return match ? `#anfang[${match[1]}]${markup.slice(match[0].length)}` : markup;
}

interface SceneOptions {
  typography: Typography;
  sceneBreak: string;
  /** The first scene of a chapter opens with a drop cap when the design has one. */
  hasDropCap: boolean;
}

function block(node: Node, options: SceneOptions): string {
  const name = node.type.name;
  if (name === "sceneBreak") return `#scenbrytning[${escapeTypst(options.sceneBreak)}]`;
  if (name === "rawBlock") return escapeTypst(String(node.attrs["source"]));
  if (name === "styleBlock") {
    const inner: string[] = [];
    node.forEach((child) => inner.push(block(child, { ...options, hasDropCap: false })));
    return `#stil(${typstString(String(node.attrs["style"]))})[\n${inner.join("\n\n")}\n]`;
  }
  return inline(node, quoteConverter(options.typography));
}

/** A scene as Typst paragraphs, separated by blank lines as Typst expects. */
export function sceneTypst(doc: Node, options: SceneOptions): string {
  const blocks: string[] = [];
  doc.forEach((node, _offset, index) => {
    const markup = block(node, options);
    const isOpening = index === 0 && options.hasDropCap && node.type.name === "paragraph";
    blocks.push(isOpening ? withDropCap(markup) : markup);
  });
  return blocks.join("\n\n");
}
