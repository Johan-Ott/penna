import type { Node } from "prosemirror-model";
import { quoteConverter, type Typography } from "./book.js";

export const escapeXml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** A whole XHTML page; EPUB requires the XHTML namespace and an epub namespace for its types. */
export function xhtmlPage(title: string, body: string, language: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${language}" xml:lang="${language}">
<head>
<meta charset="UTF-8" />
<title>${escapeXml(title)}</title>
<link rel="stylesheet" type="text/css" href="../style.css" />
</head>
<body>
${body}
</body>
</html>
`;
}

function inline(paragraph: Node, convert: (text: string) => string) {
  let html = "";
  paragraph.forEach((child) => {
    if (child.type.name === "lineBreak") return void (html += "<br />");
    let text = escapeXml(convert(child.text ?? ""));
    const marks = new Set(child.marks.map((mark) => mark.type.name));
    if (marks.has("italic")) text = `<em>${text}</em>`;
    if (marks.has("bold")) text = `<strong>${text}</strong>`;
    html += text;
  });
  return html;
}

// The first paragraph, and the one after a scene break, are set without indent, as in print.
function block(node: Node, isFirst: boolean, typography: Typography): string {
  const name = node.type.name;
  if (name === "sceneBreak") return '<hr class="scene-break" />';
  if (name === "rawBlock") return `<p>${escapeXml(String(node.attrs["source"]))}</p>`;
  if (name === "styleBlock") {
    const inner: string[] = [];
    node.forEach((child) => inner.push(block(child, true, typography)));
    return `<div class="${escapeXml(String(node.attrs["style"]))}">${inner.join("\n")}</div>`;
  }
  const html = inline(node, quoteConverter(typography));
  return isFirst ? `<p class="first">${html}</p>` : `<p>${html}</p>`;
}

/** A scene's text as XHTML paragraphs. */
export function sceneXhtml(doc: Node, typography: Typography): string {
  const blocks: string[] = [];
  let isFirst = true;
  doc.forEach((node) => {
    blocks.push(block(node, isFirst, typography));
    isFirst = node.type.name === "sceneBreak";
  });
  return blocks.join("\n");
}
