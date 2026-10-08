import type { Card, Mentions } from "./cards.js";
import type { ContentsRow } from "./contents.js";
import { labelsOf } from "./labels.js";
import { findNode, type TreeNode } from "./tree.js";

const fold = (text: string) => text.toLocaleLowerCase("sv");

/** What the filter in Innehåll looks through: the notes' names and where they are named. */
export interface FilterSources {
  tree: TreeNode[];
  fields: Record<string, unknown>;
  cards: Card[];
  mentions: Map<string, Mentions>;
}

// The chapter's own labels and its scenes'.
function labelNames(sources: FilterSources, row: ContentsRow) {
  const ids = new Set(
    [row.id, ...row.sceneIds].flatMap((id) => findNode(sources.tree, id)?.node.labels ?? []),
  );
  return labelsOf(sources.fields)
    .filter((label) => ids.has(label.id))
    .map((label) => label.name);
}

/** True when a person, place or label in the row, or its own words, holds the text. */
export function rowMatches(sources: FilterSources, row: ContentsRow, query: string) {
  const wanted = fold(query.trim());
  if (!wanted) return true;
  const named = sources.cards
    .filter((card) =>
      sources.mentions.get(card.id)?.sceneIds.some((id) => row.sceneIds.includes(id)),
    )
    .map((card) => card.name);
  const texts = [row.title, row.summary, row.pov, ...named, ...labelNames(sources, row)];
  return texts.some((text) => fold(text).includes(wanted));
}
