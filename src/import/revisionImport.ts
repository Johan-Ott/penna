import { documentText, LEAF } from "../editor/documentText.js";
import { sceneEndMark } from "../export/sceneMarks.js";
import { parseMarkdown } from "../manuscript/parseMarkdown.js";
import { docxHtml, htmlToMarkdown } from "./docxImport.js";

const START = /<a id="penna_([0-9A-Z]+)"><\/a>/g;
// Word's footnote references stand where Penna has its own footnotes, so they count as the same.
const FOOTNOTE = /<sup><a href="#footnote-\d+" id="footnote-ref-\d+">\[\d+\]<\/a><\/sup>/g;

/** The text between a scene's two marks, in the form the comparison reads. */
function sceneText(html: string) {
  const markdown = htmlToMarkdown(`<p>${html.replace(FOOTNOTE, LEAF)}</p>`);
  return documentText(parseMarkdown(markdown)).text;
}

/**
 * Each scene's text as the editor left it, by scene id. A Word file made by Penna has marks
 * around every scene; a scene whose marks the editor deleted is left out.
 */
export async function revisionTexts(docx: Uint8Array): Promise<Map<string, string>> {
  const html = await docxHtml(docx);
  const texts = new Map<string, string>();
  for (const found of html.matchAll(START)) {
    const sceneId = found[1] ?? "";
    const start = (found.index ?? 0) + found[0].length;
    const end = html.indexOf(`<a id="${sceneEndMark(sceneId)}"></a>`, start);
    if (end !== -1 && sceneId) texts.set(sceneId, sceneText(html.slice(start, end)));
  }
  return texts;
}
