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
  /** Null on the bookshelf, where there is no book to read changes into. */
  importRevision: (() => void) | null;
  /** Null where Penna keeps no copies, as in the browser. */
  showBackups: (() => void) | null;
  openSettings: () => void;
  openShortcuts: () => void;
  sendFeedback: () => void;
}

// What only a book has, shown when there is one.
const BOOK_ITEMS: [keyof AppMenuActions, string][] = [
  ["showVersions", t("Versioner av den här texten")],
  ["exportZip", t("Exportera allt som zip")],
  ["importRevision", t("Läs in redaktörens Word-fil…")],
  ["showBackups", t("Säkerhetskopior…")],
];

export function appMenu(actions: AppMenuActions): MenuItem[] {
  const bookItems: MenuItem[] = BOOK_ITEMS.flatMap(([key, label]) => {
    const onSelect = actions[key];
    return onSelect ? [{ label, onSelect }] : [];
  });
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
    { label: t("Skicka feedback…"), onSelect: actions.sendFeedback },
  ];
}
