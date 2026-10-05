import type { PaletteEntry } from "./paletteSearch.js";
import { command, type PaletteContext } from "./paletteEntries.js";
import { t } from "../../i18n/i18n.js";

export function sceneEntries(context: PaletteContext): PaletteEntry[] {
  const { splitScene, mergeScene, read, openChapterId } = context;
  return [
    ...(read && openChapterId ? [command(t("Läs kapitlet"), () => read(openChapterId))] : []),
    ...(read ? [command(t("Läs hela boken"), () => read(null))] : []),
    ...(splitScene ? [command(t("Dela scenen vid markören"), splitScene, "Ctrl+Shift+Enter")] : []),
    ...(mergeScene ? [command(t("Slå ihop med nästa scen"), mergeScene)] : []),
  ];
}

export function cardEntries({ cards, describe, openCard, newNote }: PaletteContext) {
  const entries = cards.map((card): PaletteEntry => {
    const hint = describe(card.id);
    return {
      id: `kort:${card.id}`,
      label: card.name,
      group: card.sortLabel,
      run: () => openCard(card.id),
      ...(hint ? { hint } : {}),
    };
  });
  return [...entries, command(t("Ny anteckning"), newNote)];
}
