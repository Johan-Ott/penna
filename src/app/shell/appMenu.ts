import type { MenuItem } from "../Menu.js";
import { t } from "../../i18n/i18n.js";

export interface AppMenuActions {
  showShelf: () => void;
  newProject: () => void;
  openFolder: () => void;
  /** Null when no text is open, or on the bookshelf. */
  showVersions: (() => void) | null;
  /** Null on the bookshelf, where there is no book to pack. */
  exportZip: (() => void) | null;
  openSettings: () => void;
  openShortcuts: () => void;
}

export function appMenu(actions: AppMenuActions): MenuItem[] {
  const bookItems: MenuItem[] = [
    ...(actions.showVersions
      ? [{ label: t("Versioner av den här texten"), onSelect: actions.showVersions }]
      : []),
    ...(actions.exportZip
      ? [{ label: t("Exportera allt som zip"), onSelect: actions.exportZip }]
      : []),
  ];
  const [firstBookItem, ...restBookItems] = bookItems;
  return [
    { label: t("Bokhylla"), shortcut: "Ctrl+Shift+O", onSelect: actions.showShelf },
    { label: t("Nytt projekt"), shortcut: "Ctrl+N", onSelect: actions.newProject },
    { label: t("Öppna mapp…"), onSelect: actions.openFolder },
    { label: t("Importera manus…"), onSelect: actions.newProject },
    ...(firstBookItem ? [{ ...firstBookItem, separatorBefore: true }, ...restBookItems] : []),
    {
      label: t("Inställningar"),
      shortcut: "Ctrl+,",
      separatorBefore: true,
      onSelect: actions.openSettings,
    },
    { label: t("Hjälp och kortkommandon"), shortcut: "?", onSelect: actions.openShortcuts },
  ];
}
