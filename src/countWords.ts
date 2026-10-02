const wordSegmenter = new Intl.Segmenter(undefined, { granularity: "word" });

export function countWords(text: string): number {
  let count = 0;
  for (const segment of wordSegmenter.segment(text)) {
    if (segment.isWordLike) count += 1;
  }
  return count;
}
