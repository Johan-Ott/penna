import { Schema } from "prosemirror-model";

export const STYLE_NAMES = ["brev", "citat", "dikt", "meddelande"] as const;
export type StyleName = (typeof STYLE_NAMES)[number];

// `source` and `before` keep each block's original text, so untouched blocks are saved byte for byte.
const blockAttrs = { before: { default: null }, source: { default: null } };

const isStyleName = (value: string | null): value is StyleName =>
  (STYLE_NAMES as readonly string[]).includes(value ?? "");

// ProseMirror reads null as "matches, no attributes" and false as "does not match".
const isBoldWeight = (value: string) => /^(bold|[6-9]00)$/.test(value);

// Pasting keeps paragraphs, italic and bold; headings and list items become paragraphs.
export const manuscriptSchema = new Schema({
  nodes: {
    doc: { content: "block*", attrs: { trailing: { default: "\n" } } },
    paragraph: {
      group: "block",
      content: "inline*",
      attrs: { ...blockAttrs, canonical: { default: null } },
      parseDOM: [{ tag: "p" }, { tag: "h1" }, { tag: "h2" }, { tag: "h3" }, { tag: "li" }],
      toDOM: () => ["p", 0],
    },
    styleBlock: {
      group: "block",
      content: "(paragraph | sceneBreak | rawBlock)+",
      attrs: {
        before: { default: null },
        style: { default: "brev" },
        openFence: { default: null },
        innerTrailing: { default: null },
        closeFence: { default: null },
      },
      parseDOM: [
        {
          tag: "div[data-style]",
          getAttrs: (element) => {
            const style = element.getAttribute("data-style");
            return isStyleName(style) ? { style } : false;
          },
        },
        { tag: "blockquote", attrs: { style: "citat" } },
      ],
      toDOM: (node) => {
        const style = String(node.attrs["style"]);
        return ["div", { class: `style style-${style}`, "data-style": style }, 0];
      },
    },
    sceneBreak: {
      group: "block",
      atom: true,
      attrs: blockAttrs,
      parseDOM: [{ tag: "hr" }, { tag: "div.scene-break" }],
      toDOM: () => ["div", { class: "scene-break", contenteditable: "false" }, "* * *"],
    },
    rawBlock: {
      group: "block",
      atom: true,
      attrs: blockAttrs,
      parseDOM: [
        { tag: "pre.raw-block", getAttrs: (element) => ({ source: element.textContent }) },
      ],
      toDOM: (node) => ["pre", { class: "raw-block" }, String(node.attrs["source"])],
    },
    text: { group: "inline" },
    // A footnote's text is plain text kept on the node; CSS numbers the markers in order.
    footnote: {
      group: "inline",
      inline: true,
      atom: true,
      attrs: { label: { default: "1" }, text: { default: "" } },
      parseDOM: [
        {
          tag: "sup.footnote",
          getAttrs: (element) => ({
            label: element.getAttribute("data-label") ?? "1",
            text: element.getAttribute("data-text") ?? "",
          }),
        },
      ],
      toDOM: (node) => [
        "sup",
        {
          class: "footnote",
          "data-label": String(node.attrs["label"]),
          "data-text": String(node.attrs["text"]),
          title: String(node.attrs["text"]),
        },
      ],
    },
    lineBreak: {
      group: "inline",
      inline: true,
      selectable: false,
      parseDOM: [{ tag: "br" }],
      toDOM: () => ["br"],
    },
  },
  marks: {
    italic: {
      parseDOM: [{ tag: "em" }, { tag: "i" }, { style: "font-style=italic" }],
      toDOM: () => ["em", 0],
    },
    bold: {
      parseDOM: [
        { tag: "strong" },
        { tag: "b" },
        { style: "font-weight", getAttrs: (value) => (isBoldWeight(value) ? null : false) },
      ],
      toDOM: () => ["strong", 0],
    },
    raw: { inclusive: false, toDOM: () => ["span", { class: "raw-inline" }, 0] },
  },
});
