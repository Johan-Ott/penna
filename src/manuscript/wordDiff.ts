export interface DiffPart {
  kind: "same" | "removed" | "added";
  text: string;
}

// Each token keeps its spaces, so joining the tokens gives the text back.
const tokens = (text: string) => text.match(/\s*\S+\s*/g) ?? [];
type IsSame = (first: string | undefined, second: string | undefined) => boolean;
/** For reading: a word is the same whatever spaces follow it. */
const sameWord: IsSame = (first, second) => first?.trim() === second?.trim();
const sameToken: IsSame = (first, second) => first === second;
// Spaces as tokens of their own, so a changed space never takes the word before it along.
const exactTokens = (text: string) => text.match(/\s+|\S+/g) ?? [];

// Above this many cells the middle is shown as removed and added whole, to stay fast.
const MAX_CELLS = 4_000_000;

function commonEnds(old: string[], now: string[], isSame: IsSame) {
  let start = 0;
  while (start < old.length && start < now.length && isSame(old[start], now[start])) start++;
  let end = 0;
  while (
    end < old.length - start &&
    end < now.length - start &&
    isSame(old[old.length - 1 - end], now[now.length - 1 - end])
  ) {
    end++;
  }
  return { start, end };
}

// Longest common subsequence lengths: lengthAt(row, col) is for the words from there to the end.
function lcsTable(old: string[], now: string[], isSame: IsSame) {
  const width = now.length + 1;
  const lengths = new Uint32Array((old.length + 1) * width);
  const lengthAt = (row: number, col: number) => lengths[row * width + col] ?? 0;
  for (let row = old.length - 1; row >= 0; row--) {
    for (let col = now.length - 1; col >= 0; col--) {
      lengths[row * width + col] = isSame(old[row], now[col])
        ? lengthAt(row + 1, col + 1) + 1
        : Math.max(lengthAt(row + 1, col), lengthAt(row, col + 1));
    }
  }
  return lengthAt;
}

type LengthAt = ReturnType<typeof lcsTable>;

function stepKind(
  words: { old: string[]; now: string[]; isSame: IsSame },
  lengthAt: LengthAt,
  place: { row: number; col: number },
) {
  const { old, now, isSame } = words;
  const { row, col } = place;
  if (row === old.length) return "added";
  if (col === now.length) return "removed";
  if (isSame(old[row], now[col])) return "same";
  return lengthAt(row, col + 1) >= lengthAt(row + 1, col) ? "added" : "removed";
}

function diffMiddle(old: string[], now: string[], isSame: IsSame): DiffPart[] {
  if (old.length * now.length > MAX_CELLS) {
    return [
      { kind: "removed", text: old.join("") },
      { kind: "added", text: now.join("") },
    ];
  }
  const lengthAt = lcsTable(old, now, isSame);
  const parts: DiffPart[] = [];
  let row = 0;
  let col = 0;
  while (row < old.length || col < now.length) {
    const kind = stepKind({ old, now, isSame }, lengthAt, { row, col });
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

/** `isExact` is for changing the text: spaces count too, so both texts' offsets stay exact. */
export function diffWords(oldText: string, newText: string, isExact = false): DiffPart[] {
  const split = isExact ? exactTokens : tokens;
  const isSame = isExact ? sameToken : sameWord;
  const old = split(oldText);
  const now = split(newText);
  const { start, end } = commonEnds(old, now, isSame);
  return grouped(
    merged([
      { kind: "same", text: now.slice(0, start).join("") },
      ...diffMiddle(old.slice(start, old.length - end), now.slice(start, now.length - end), isSame),
      { kind: "same", text: now.slice(now.length - end).join("") },
    ]),
  );
}

/** Counted in the changed middle. */
export function changedWords(oldText: string, newText: string): number {
  const old = tokens(oldText);
  const now = tokens(newText);
  const { start, end } = commonEnds(old, now, sameWord);
  return Math.max(old.length - start - end, now.length - start - end);
}
