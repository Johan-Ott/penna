import type { SceneSummary } from "./sceneSummaries.js";
import { NOTES_ID, sceneIdsIn, sortsOf, type TreeNode } from "./tree.js";

/** A note whose name is linked in the text: an ordinary scene file in a sort. Its title is the name. */
export interface Card {
  id: string;
  sortId: string;
  name: string;
}

/** Linked unless they say otherwise; in Övrigt only when they say so. */
export const isLinkedByDefault = (sortId: string) => sortId !== NOTES_ID;

// A scene whose file has not arrived yet has no summary, and so no name.
export function cardsOf(tree: TreeNode[], summaries: Record<string, SceneSummary>): Card[] {
  return sortsOf(tree).flatMap((sort) =>
    sceneIdsIn(tree, sort.id).flatMap((id) => {
      const summary = summaries[id];
      const isLinked = summary?.link ?? isLinkedByDefault(sort.id);
      return summary && isLinked ? [{ id, sortId: sort.id, name: summary.title }] : [];
    }),
  );
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A trailing s is the Swedish genitive: "Arvids händer". */
export function mentionPattern(name: string): RegExp | null {
  const trimmed = name.trim();
  if (trimmed === "") return null;
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(trimmed)}s?(?![\\p{L}\\p{N}])`, "gu");
}

export interface Mentions {
  count: number;
  sceneIds: string[];
  /** Keyed by scene id. */
  sentences: Record<string, string>;
}

const SENTENCES = /[^.!?\n]+[.!?]*/g;

function firstSentenceWith(text: string, pattern: RegExp) {
  const sentence = (text.match(SENTENCES) ?? []).find((each) => each.search(pattern) >= 0);
  return sentence?.trim() ?? "";
}

/** Counted, never stored. */
export function countMentions(cards: Card[], sceneTexts: Record<string, string>) {
  const mentions = new Map<string, Mentions>();
  for (const card of cards) {
    const pattern = mentionPattern(card.name);
    const found: Mentions = { count: 0, sceneIds: [], sentences: {} };
    for (const [sceneId, sceneText] of Object.entries(sceneTexts)) {
      const count = pattern ? (sceneText.match(pattern) ?? []).length : 0;
      if (!pattern || count === 0) continue;
      found.count += count;
      found.sceneIds.push(sceneId);
      found.sentences[sceneId] = firstSentenceWith(sceneText, new RegExp(pattern.source, "u"));
    }
    mentions.set(card.id, found);
  }
  return mentions;
}

const MIN_RANGE = 3;

/** "1–8" for a run, otherwise "1, 2, 5, 8". */
export function chapterRuns(chapters: number[]): string {
  const sorted = [...new Set(chapters)].sort((first, second) => first - second);
  const parts: string[] = [];
  for (let start = 0; start < sorted.length;) {
    let end = start;
    while (sorted[end + 1] === (sorted[end] ?? 0) + 1) end++;
    const run = sorted.slice(start, end + 1);
    parts.push(run.length >= MIN_RANGE ? `${run[0]}–${run[run.length - 1]}` : run.join(", "));
    start = end + 1;
  }
  return parts.join(", ");
}
