import { t } from "../i18n/i18n.js";
import type { ProseNote } from "../manuscript/prose.js";
import type { Card, Mentions } from "./cards.js";
import { CHARACTERS_ID, manuscriptSceneIds, type TreeNode } from "./tree.js";
import { chapterOf } from "./treeLabels.js";

const MIN_CHAPTERS = 6;
const MIN_MENTIONS = 3;

/** People named often early on who are gone from the last third of the book. */
export function fadingPeople(
  cards: Card[],
  mentions: Map<string, Mentions>,
  tree: TreeNode[],
): ProseNote[] {
  const chapterNumber = (sceneId: string) => chapterOf(tree, sceneId)?.number ?? 0;
  const total = Math.max(0, ...manuscriptSceneIds(tree).map(chapterNumber));
  if (total < MIN_CHAPTERS) return [];
  const lastThird = total - Math.ceil(total / 3);
  return cards
    .filter((card) => card.sortId === CHARACTERS_ID)
    .flatMap((card) => {
      const found = mentions.get(card.id);
      if (!found || found.count < MIN_MENTIONS) return [];
      const last = Math.max(...found.sceneIds.map(chapterNumber));
      if (last > lastThird) return [];
      const text = t("{name} nämns senast i kapitel {last} av {total}.", {
        name: card.name,
        last,
        total,
      });
      return [{ kind: "fading" as const, title: t("Försvinner ur boken"), text }];
    });
}
