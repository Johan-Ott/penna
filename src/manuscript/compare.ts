import { parseMarkdown } from "./parseMarkdown.js";

const CONTEXT_WORDS = 5;
const MAX_LENGTH = 80;

function firstDifference(first: string, second: string): number {
  let index = 0;
  while (index < first.length && first[index] === second[index]) index++;
  return index;
}

function excerptFrom(text: string, start: number): string {
  const opening = start > 0 ? "…" : "";
  const rest = text.slice(start);
  const cut = rest.length > MAX_LENGTH ? `${rest.slice(0, MAX_LENGTH - 1).trimEnd()}…` : rest;
  return opening + cut;
}

/** Short excerpts of two versions, starting a few words before they first differ. */
export function differingExcerpts(mine: string, theirs: string) {
  const difference = firstDifference(mine, theirs);
  const wordsBefore = mine.slice(0, difference).split(/(?<=\s)/);
  const contextLength = wordsBefore.slice(-CONTEXT_WORDS).join("").length;
  const start = wordsBefore.length > CONTEXT_WORDS ? difference - contextLength : 0;
  return { mine: excerptFrom(mine, start), theirs: excerptFrom(theirs, start) };
}

/** A scene body as the writer sees it, without markdown marks, blocks joined by a space. */
export function plainText(markdown: string, blockSeparator = " "): string {
  const doc = parseMarkdown(markdown);
  return doc.textBetween(0, doc.content.size, blockSeparator);
}
