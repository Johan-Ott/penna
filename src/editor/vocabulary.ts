// The book's own words, for completing a word and guessing the next one while writing. Counted
// from the text alone, on this computer.

export interface CompletionWords {
  /** The people's and places' names, offered after two letters. */
  names: string[];
  /** The book's words of four letters or more, the most used first. */
  words: string[];
  /** The word that most often follows a word, by the word in lower case. */
  nextOf: Record<string, string>;
}

export const NO_WORDS: CompletionWords = { names: [], words: [], nextOf: {} };

const LONG_ENOUGH = 4;
// A next word is offered only when the book shows it often and mostly.
const SEEN = 3;
const SHARE = 0.5;

function countWords(tokens: string[]) {
  const counts = new Map<string, number>();
  for (const token of tokens) {
    if (token.length >= LONG_ENOUGH) counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return [...counts]
    .filter(([, count]) => count >= 2)
    .sort((first, second) => second[1] - first[1]);
}

function countPairs(sentences: string[][]) {
  const pairs = new Map<string, Map<string, number>>();
  for (const words of sentences) {
    words.slice(1).forEach((word, index) => {
      const before = (words[index] ?? "").toLowerCase();
      const after = pairs.get(before) ?? new Map<string, number>();
      after.set(word, (after.get(word) ?? 0) + 1);
      pairs.set(before, after);
    });
  }
  return pairs;
}

// The usual next word, when it is seen often and mostly; null otherwise.
function usual(after: Map<string, number>) {
  const total = [...after.values()].reduce((sum, count) => sum + count, 0);
  const [best, count = 0] = [...after].sort((first, second) => second[1] - first[1])[0] ?? [];
  return best && count >= SEEN && count / total >= SHARE ? best : null;
}

function likelyNext(sentences: string[][]) {
  const nextOf: Record<string, string> = {};
  for (const [before, after] of countPairs(sentences)) {
    const next = usual(after);
    if (next) nextOf[before] = next;
  }
  return nextOf;
}

/** What the book's texts teach the completion: its common words and its usual next words. */
export function learnWords(texts: string[]): Omit<CompletionWords, "names"> {
  const sentences = texts.flatMap((text) =>
    text.split(/[.!?\n]+/).map((sentence) => sentence.match(/\p{L}+/gu) ?? []),
  );
  const words = countWords(sentences.flat()).map(([word]) => word);
  return { words, nextOf: likelyNext(sentences) };
}
