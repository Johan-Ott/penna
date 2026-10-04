import type { Node } from "prosemirror-model";
import { quoteConverter, type Typography } from "./book.js";

/** Prose as Typst markup: every character Typst could read as code is escaped. */
export const escapeTypst = (text: string) => text.replace(/[\\#*_`$<>@[\]~=\-+/"':({]/g, "\\$&");

/** Text inside a Typst string literal, as in `"Vintervägen"`. */
export const typstString = (text: string) =>
  `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

const childrenOf = (paragraph: Node) => {
  const children: Node[] = [];
  paragraph.forEach((child) => children.push(child));
  return children;
};

function marked(text: string, child: Node) {
  let markup = escapeTypst(text);
  const marks = new Set(child.marks.map((mark) => mark.type.name));
  if (marks.has("italic")) markup = `#emph[${markup}]`;
  if (marks.has("bold")) markup = `#strong[${markup}]`;
  return markup;
}

function inline(children: Node[], convert: (text: string) => string) {
  return children
    .map((child) =>
      child.type.name === "lineBreak" ? " \\\n" : marked(convert(child.text ?? ""), child),
    )
    .join("");
}

// The paragraph as words, each with its own marks; a word split by a mark stays one word.
function wordsOf(children: Node[], convert: (text: string) => string) {
  const words: string[] = [""];
  for (const child of children) {
    if (child.type.name === "lineBreak") {
      words.push("#linebreak()", "");
      continue;
    }
    // Split keeps the spaces at odd places: a space starts a new word, text adds to the last.
    convert(child.text ?? "")
      .split(/(\s+)/)
      .forEach((piece, index) => {
        if (index % 2 === 1) words.push("");
        else if (piece !== "") words[words.length - 1] += marked(piece, child);
      });
  }
  return words.filter((word) => word !== "");
}

const plainLetter = (node: Node | undefined) =>
  node?.isText && node.marks.length === 0 ? /^\p{L}/u.exec(node.text ?? "")?.[0] : undefined;

// The chapter opens with an anfang: the first letter, then the paragraph as words, so Typst
// can fit as many as there is room for beside the letter.
function withDropCap(paragraph: Node, convert: (text: string) => string) {
  const [first, ...others] = childrenOf(paragraph);
  const letter = plainLetter(first);
  if (!first || !letter) return inline(childrenOf(paragraph), convert);
  const rest = [first.type.schema.text((first.text ?? "").slice(1) || " "), ...others];
  const words = wordsOf(rest, convert).map((word) => `[${word}]`);
  return `#anfang(${typstString(letter)}, (${words.join(", ")},))`;
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
  return inline(childrenOf(node), quoteConverter(options.typography));
}

/** A scene as Typst paragraphs, separated by blank lines as Typst expects. */
export function sceneTypst(doc: Node, options: SceneOptions): string {
  const blocks: string[] = [];
  const hasAnfang = options.hasDropCap && doc.firstChild?.type.name === "paragraph";
  doc.forEach((node, _offset, index) => {
    const convert = quoteConverter(options.typography);
    if (index === 0 && hasAnfang) return void blocks.push(withDropCap(node, convert));
    // Typst sees the anfang as a block, so the paragraph after it is indented by hand.
    const indent = index === 1 && hasAnfang && node.type.name === "paragraph" ? "#h(1.2em)" : "";
    blocks.push(indent + block(node, options));
  });
  return blocks.join("\n\n");
}
