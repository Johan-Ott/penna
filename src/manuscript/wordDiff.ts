export interface DiffPart {
  kind: "same" | "removed" | "added";
  text: string;
}

// Each token keeps its spaces, so joining the tokens gives the text back.
const tokens = (text: string) => text.match(/\s*\S+\s*/g) ?? [];
const sameWord = (first: string | undefined, second: string | undefined) =>
  first?.trim() === second?.trim();

// Above this many cells the middle is shown as removed and added whole, to stay fast.
const MAX_CELLS = 4_000_000;

function commonEnds(old: string[], now: string[]) {
  let start = 0;
  while (start < old.length && start < now.length && sameWord(old[start], now[start])) start++;
  let end = 0;
  while (
    end < old.length - start &&
    end < now.length - start &&
    sameWord(old[old.length - 1 - end], now[now.length - 1 - end])
  ) {
    end++;
  }
  return { start, end };
}

// Longest common subsequence lengths: lengthAt(row, col) is for the words from there to the end.
function lcsTable(old: string[], now: string[]) {
  const width = now.length + 1;
  const lengths = new Uint32Array((old.length + 1) * width);
  const lengthAt = (row: number, col: number) => lengths[row * width + col] ?? 0;
  for (let row = old.length - 1; row >= 0; row--) {
    for (let col = now.length - 1; col >= 0; col--) {
      lengths[row * width + col] = sameWord(old[row], now[col])
        ? lengthAt(row + 1, col + 1) + 1
        : Math.max(lengthAt(row + 1, col), lengthAt(row, col + 1));
    }
  }
  return lengthAt;
}

type LengthAt = ReturnType<typeof lcsTable>;

function stepKind(
  old: string[],
  now: string[],
  lengthAt: LengthAt,
  place: { row: number; col: number },
) {
  const { row, col } = place;
  if (row === old.length) return "added";
  if (col === now.length) return "removed";
  if (sameWord(old[row], now[col])) return "same";
  return lengthAt(row, col + 1) >= lengthAt(row + 1, col) ? "added" : "removed";
}

function diffMiddle(old: string[], now: string[]): DiffPart[] {
  if (old.length * now.length > MAX_CELLS) {
    return [
      { kind: "removed", text: old.join("") },
      { kind: "added", text: now.join("") },
    ];
  }
  const lengthAt = lcsTable(old, now);
  const parts: DiffPart[] = [];
  let row = 0;
  let col = 0;
  while (row < old.length || col < now.length) {
    const kind = stepKind(old, now, lengthAt, { row, col });
    parts.push({ kind, text: (kind === "removed" ? old[row] : now[col]) ?? "" });
    if (kind !== "added") row++;
    if (kind !== "removed") col++;
  }
  return parts;
}

// A word or two in common between changes reads better as part of the change.
const ISLAND_WORDS = 2;

function grouped(parts: DiffPart[]): DiffPart[] {
  const result: DiffPart[] = [];
  let removed = "";
  let added = "";
  const closeChange = () => {
    if (removed) result.push({ kind: "removed", text: removed });
    if (added) result.push({ kind: "added", text: added });
    removed = "";
    added = "";
  };
  parts.forEach((part, index) => {
    const isIsland =
      part.kind === "same" &&
      index > 0 &&
      index < parts.length - 1 &&
      tokens(part.text).length <= ISLAND_WORDS;
    if (part.kind === "same" && !isIsland) {
      closeChange();
      result.push(part);
      return;
    }
    if (part.kind !== "added") removed += part.text;
    if (part.kind !== "removed") added += part.text;
  });
  closeChange();
  return result;
}

function merged(parts: DiffPart[]): DiffPart[] {
  const result: DiffPart[] = [];
  for (const part of parts) {
    const last = result[result.length - 1];
    if (last?.kind === part.kind) last.text += part.text;
    else if (part.text !== "") result.push({ ...part });
  }
  return result;
}

export function diffWords(oldText: string, newText: string): DiffPart[] {
  const old = tokens(oldText);
  const now = tokens(newText);
  const { start, end } = commonEnds(old, now);
  return grouped(
    merged([
      { kind: "same", text: now.slice(0, start).join("") },
      ...diffMiddle(old.slice(start, old.length - end), now.slice(start, now.length - end)),
      { kind: "same", text: now.slice(now.length - end).join("") },
    ]),
  );
}

/** Counted in the changed middle. */
export function changedWords(oldText: string, newText: string): number {
  const old = tokens(oldText);
  const now = tokens(newText);
  const { start, end } = commonEnds(old, now);
  return Math.max(old.length - start - end, now.length - start - end);
}
