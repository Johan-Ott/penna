/** Portrait for TikTok and Reels, square for Instagram's feed. */
export type ExcerptFormat = "staende" | "kvadrat";

export const SIZES: Record<ExcerptFormat, { width: number; height: number }> = {
  staende: { width: 1080, height: 1920 },
  kvadrat: { width: 1080, height: 1080 },
};

export interface Excerpt {
  text: string;
  title: string;
  /** "Kapitel 8 · Elin Berg", under the title. */
  byline: string;
  font: string;
}

/** Paper, dark or plain white, as the design's three styles. */
export type ExcerptLook = "papper" | "mork" | "minimal";

const LOOKS: Record<ExcerptLook, { paper: string; ink: string }> = {
  papper: { paper: "#f2f2f0", ink: "#111111" },
  mork: { paper: "#111111", ink: "#ffffff" },
  minimal: { paper: "#ffffff", ink: "#111111" },
};

const PADDING = 120;
/** A post shows at most this much of the manuscript; the rest stays with the writer. */
export const MOST_CHARACTERS = 280;

/** The excerpt cut at a word within the limit, with an ellipsis when it was longer. */
export function shortened(text: string) {
  if (text.length <= MOST_CHARACTERS) return text;
  const cut = text.slice(0, MOST_CHARACTERS);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 1))}…`;
}

/** The text broken into lines that fit `width` in the canvas's current font. */
export function wrapLines(context: CanvasRenderingContext2D, text: string, width: number) {
  return text.split("\n").flatMap((paragraph) => {
    const lines: string[] = [];
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (context.measureText(next).width > width && line) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    return [...lines, line];
  });
}

// The largest size, down to a floor, at which the whole excerpt fits above the footer.
function fit(
  context: CanvasRenderingContext2D,
  text: string,
  font: string,
  room: { width: number; height: number },
) {
  for (let size = 72; ; size -= 2) {
    context.font = `${size}px "${font}", Georgia, serif`;
    const lines = wrapLines(context, text, room.width);
    if (lines.length * size * 1.5 <= room.height || size <= 28) return { size, lines };
  }
}

function drawFooter(context: CanvasRenderingContext2D, excerpt: Excerpt, bottom: number) {
  context.globalAlpha = 1;
  context.font = `500 34px "Geist Sans", system-ui, sans-serif`;
  context.fillText(excerpt.title, PADDING, bottom - 50);
  context.globalAlpha = 0.7;
  context.font = `30px "Geist Sans", system-ui, sans-serif`;
  context.fillText(excerpt.byline, PADDING, bottom);
  context.globalAlpha = 1;
}

/** The excerpt in the book's type, under a large quotation mark, with the book and author below. */
export function drawExcerpt(
  canvas: HTMLCanvasElement,
  excerpt: Excerpt,
  format: ExcerptFormat,
  look: ExcerptLook,
) {
  const { width, height } = SIZES[format];
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return;
  const colours = LOOKS[look];
  context.fillStyle = colours.paper;
  context.fillRect(0, 0, width, height);
  context.fillStyle = colours.ink;
  context.textBaseline = "top";
  context.globalAlpha = 0.35;
  context.font = `200px "${excerpt.font}", Georgia, serif`;
  context.fillText("”", PADDING - 10, PADDING);
  context.globalAlpha = 1;
  const room = { width: width - PADDING * 2, height: height - PADDING * 2 - 380 };
  const { size, lines } = fit(context, shortened(excerpt.text), excerpt.font, room);
  const top = PADDING + 220 + (room.height - lines.length * size * 1.5) / 2;
  lines.forEach((line, index) => context.fillText(line, PADDING, top + index * size * 1.5));
  drawFooter(context, excerpt, height - PADDING - 30);
}
