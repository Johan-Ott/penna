import type { BookDetails } from "./book.js";
import { escapeXml } from "./xhtml.js";

// The size e-book shops ask for, 1600 × 2560, drawn like the black cover on the bookshelf.
const WIDTH = 1600;
const HEIGHT = 2560;
const LINE_CHARACTERS = 14;
const TITLE_SIZE = 150;

// A long title is broken between words so each line fits the cover.
function titleLines(title: string): string[] {
  const lines: string[] = [];
  for (const word of title.split(/\s+/).filter(Boolean)) {
    const last = lines[lines.length - 1];
    if (last !== undefined && `${last} ${word}`.length <= LINE_CHARACTERS) {
      lines[lines.length - 1] = `${last} ${word}`;
    } else lines.push(word);
  }
  return lines;
}

/** A typographic cover until the writer picks a picture of their own. */
export function epubCover(book: BookDetails): string {
  const lines = titleLines(book.title);
  const top = HEIGHT / 2 - ((lines.length - 1) * TITLE_SIZE * 1.15) / 2;
  const title = lines
    .map(
      (line, index) =>
        `<text x="160" y="${Math.round(top + index * TITLE_SIZE * 1.15)}" font-size="${TITLE_SIZE}" font-weight="600">${escapeXml(line)}</text>`,
    )
    .join("\n  ");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#1c1c1c" />
  <rect width="40" height="${HEIGHT}" fill="#000000" opacity="0.25" />
  <g fill="#ffffff" font-family="Georgia, serif">
  <text x="160" y="260" font-size="56" letter-spacing="8" font-family="Helvetica, Arial, sans-serif">${escapeXml(book.subtitle.toLocaleUpperCase("sv-SE"))}</text>
  ${title}
  <text x="160" y="${HEIGHT - 220}" font-size="72">${escapeXml(book.author)}</text>
  </g>
</svg>
`;
}
