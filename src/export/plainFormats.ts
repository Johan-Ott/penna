import type { Node } from "prosemirror-model";
import { plainText } from "../manuscript/compare.js";
import { serializeMarkdown } from "../manuscript/serializeMarkdown.js";
import type { OutlineItem, Typography } from "./book.js";
import { escapeXml, sceneXhtml } from "./xhtml.js";

// The book as one Markdown, text or HTML file: for a blog, a web serial or another program.

export type PlainFormat = "markdown" | "text" | "html";

interface PlainBook {
  title: string;
  author: string;
  outline: OutlineItem[];
  scenes: Map<string, Node>;
}

const SCENE_BREAK = "* * *";

const headingText = (item: Exclude<OutlineItem, { kind: "scene" }>) =>
  [item.kind === "part" ? `Del ${item.number}` : `${item.number}.`, item.title]
    .filter(Boolean)
    .join(item.kind === "part" ? " · " : " ");

// The headings and scenes in order; a break between two scenes of the same chapter.
function blocks(
  book: PlainBook,
  heading: (level: number, text: string) => string,
  scene: (doc: Node) => string,
) {
  const out: string[] = [];
  let isAfterScene = false;
  for (const item of book.outline) {
    if (item.kind === "scene") {
      const doc = book.scenes.get(item.id);
      if (!doc) continue;
      if (isAfterScene) out.push(SCENE_BREAK);
      out.push(scene(doc));
      isAfterScene = true;
    } else {
      out.push(heading(item.kind === "part" ? 2 : 3, headingText(item)));
      isAfterScene = false;
    }
  }
  return out;
}

function markdown(book: PlainBook) {
  const head = [`# ${book.title}`, book.author ? `*${book.author}*` : ""].filter(Boolean);
  const body = blocks(book, (level, text) => `${"#".repeat(level)} ${text}`, serializeMarkdown);
  return [...head, ...body].join("\n\n");
}

function text(book: PlainBook) {
  const head = [book.title.toLocaleUpperCase(), book.author].filter(Boolean);
  const body = blocks(
    book,
    (_level, title) => title.toLocaleUpperCase(),
    (doc) => plainText(serializeMarkdown(doc), "\n\n"),
  );
  return [...head, ...body].join("\n\n");
}

function html(book: PlainBook, typography: Typography, language: string) {
  const body = blocks(
    book,
    (level, title) => `<h${level}>${escapeXml(title)}</h${level}>`,
    (doc) => sceneXhtml(doc, typography),
  ).map((part) => (part === SCENE_BREAK ? '<p class="break">* * *</p>' : part));
  return `<!doctype html>
<html lang="${language}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeXml(book.title)}</title>
<style>
body { max-width: 36em; margin: 3em auto; padding: 0 1em; font: 1.1em/1.6 Georgia, serif; }
h1, h2, h3 { text-align: center; } .break { text-align: center; } p { margin: 0; text-indent: 1.5em; }
</style>
</head>
<body>
<h1>${escapeXml(book.title)}</h1>
${book.author ? `<p class="break">${escapeXml(book.author)}</p>` : ""}
${body.join("\n")}
</body>
</html>
`;
}

/** The whole book in one file, as UTF-8 bytes. */
export function plainBook(
  book: PlainBook,
  format: PlainFormat,
  typography: Typography,
  language: string,
) {
  const write: Record<PlainFormat, () => string> = {
    markdown: () => markdown(book),
    text: () => text(book),
    html: () => html(book, typography, language),
  };
  const content = write[format]();
  return new TextEncoder().encode(content.endsWith("\n") ? content : `${content}\n`);
}
