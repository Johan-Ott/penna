export interface StyleFence {
  start: number;
  end: number;
  style: string;
  /** The opening line including its line ending, for example "::: brev\n". */
  openFence: string;
  innerStart: number;
  innerEnd: number;
  /** The closing line without its line ending. */
  closeFence: string;
}

interface Line {
  start: number;
  end: number;
  text: string;
}

const OPEN_FENCE = /^:::[ \t]*(\S+)[ \t]*$/;
const CLOSE_FENCE = /^:::[ \t]*$/;
const withoutLineEnding = (text: string) => text.replace(/\r?\n$/, "");

function splitLines(text: string): Line[] {
  const lines: Line[] = [];
  for (let start = 0; start < text.length;) {
    const newline = text.indexOf("\n", start);
    const end = newline === -1 ? text.length : newline + 1;
    lines.push({ start, end, text: text.slice(start, end) });
    start = end;
  }
  return lines;
}

/** Finds `::: stil` ... `:::` blocks. An opening line without a closing line is plain text. */
export function findStyleFences(text: string): StyleFence[] {
  const lines = splitLines(text);
  const fences: StyleFence[] = [];
  for (let index = 0; index < lines.length; index++) {
    const open = lines[index];
    const style = open && OPEN_FENCE.exec(withoutLineEnding(open.text))?.[1];
    if (!open || !style) continue;
    const closeIndex = lines.findIndex(
      (line, later) => later > index && CLOSE_FENCE.test(withoutLineEnding(line.text)),
    );
    const close = lines[closeIndex];
    if (!close) continue;
    const closeFence = withoutLineEnding(close.text);
    fences.push({
      start: open.start,
      end: close.start + closeFence.length,
      style,
      openFence: open.text,
      innerStart: open.end,
      innerEnd: close.start,
      closeFence,
    });
    index = closeIndex;
  }
  return fences;
}
