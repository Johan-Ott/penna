/** Portrait for TikTok and Reels, square for Instagram's feed. */
export type ExcerptFormat = "staende" | "kvadrat";

export const SIZES: Record<ExcerptFormat, { width: number; height: number }> = {
  staende: { width: 1080, height: 1920 },
  kvadrat: { width: 1080, height: 1080 },
};

export interface Excerpt {
  text: string;
  title: string;
  author: string;
  font: string;
}

const PADDING = 120;
const PAPER = "#f6f1e8";
const INK = "#2a2622";
const QUIET = "#8a8178";

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
function fit(context: CanvasRenderingContext2D, excerpt: Excerpt, width: number, height: number) {
  for (let size = 64; ; size -= 2) {
    context.font = `${size}px "${excerpt.font}", Georgia, serif`;
    const lines = wrapLines(context, excerpt.text, width);
    if (lines.length * size * 1.5 <= height || size <= 28) return { size, lines };
  }
}

/** Draws the excerpt in the book's type on warm paper, with the title and author below. */
export function drawExcerpt(canvas: HTMLCanvasElement, excerpt: Excerpt, format: ExcerptFormat) {
  const { width, height } = SIZES[format];
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.fillStyle = PAPER;
  context.fillRect(0, 0, width, height);
  const room = height - PADDING * 2 - 140;
  const { size, lines } = fit(context, excerpt, width - PADDING * 2, room);
  const lineHeight = size * 1.5;
  const top = PADDING + (room - lines.length * lineHeight) / 2;
  context.fillStyle = INK;
  context.textBaseline = "top";
  lines.forEach((line, index) => context.fillText(line, PADDING, top + index * lineHeight));
  context.fillStyle = QUIET;
  context.font = `italic 34px "${excerpt.font}", Georgia, serif`;
  context.fillText(excerpt.title, PADDING, height - PADDING - 70);
  context.font = `28px "${excerpt.font}", Georgia, serif`;
  context.fillText(excerpt.author, PADDING, height - PADDING - 24);
}
