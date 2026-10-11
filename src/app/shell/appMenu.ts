import type { MenuItem } from "../Menu.js";
import { checkForUpdates } from "../updates.js";
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
  /** Skicka till redaktör and Läsarexemplar; empty on the bookshelf. */
  sharing: MenuItem[];
  /** Null where Penna keeps no copies, as in the browser. */
  showBackups: (() => void) | null;
  openSettings: () => void;
  openShortcuts: () => void;
  sendFeedback: () => void;
}

// What only a book has, shown when there is one.
type BookAction = "showVersions" | "exportZip" | "importRevision" | "showBackups";
const BOOK_ITEMS: [BookAction, string][] = [
  ["showVersions", t("Versioner av den här texten")],
  ["exportZip", t("Exportera allt som zip")],
  ["importRevision", t("Läs in redaktörens Word-fil…")],
  ["showBackups", t("Säkerhetskopior…")],
];

/** A row that opens its items beside it; none when it has nothing to hold. */
export const group = (label: string, items: MenuItem[], separatorBefore = false): MenuItem[] =>
  items.length > 0 ? [{ label, submenu: items, separatorBefore }] : [];

/** Hjälp, feedback and updates: the same under Hjälp on the computer and the phone. */
export const helpItems = (help: MenuItem, sendFeedback: () => void): MenuItem[] => [
  help,
  { label: t("Skicka feedback…"), onSelect: sendFeedback },
  { label: t("Sök efter uppdateringar…"), onSelect: () => void checkForUpdates(true) },
];

const bookItem = (actions: AppMenuActions, key: BookAction): MenuItem[] => {
  const onSelect = actions[key];
  const label = BOOK_ITEMS.find(([item]) => item === key)?.[1] ?? "";
  return onSelect ? [{ label, onSelect }] : [];
};

// Sharing and copies, which only a book has.
const bookGroups = (actions: AppMenuActions): MenuItem[] => [
  ...group(
    t("Dela och samarbeta"),
    [...actions.sharing, ...bookItem(actions, "importRevision")],
    true,
  ),
  ...group(t("Kopior och export"), [
    ...bookItem(actions, "showVersions"),
    ...bookItem(actions, "exportZip"),
    ...bookItem(actions, "showBackups"),
  ]),
];

export function appMenu(actions: AppMenuActions): MenuItem[] {
  const help = {
    label: t("Hjälp och kortkommandon"),
    shortcut: "?",
    onSelect: actions.openShortcuts,
  };
  return [
    { label: t("Bokhylla"), shortcut: "Ctrl+Shift+O", onSelect: actions.showShelf },
    { label: t("Nytt projekt"), shortcut: "Ctrl+N", onSelect: actions.newProject },
    ...group(t("Öppna och importera"), [
      { label: t("Öppna mapp…"), onSelect: actions.openFolder },
      { label: t("Importera manus…"), onSelect: actions.newProject },
    ]),
    ...bookGroups(actions),
    {
      label: t("Inställningar"),
      shortcut: "Ctrl+,",
      separatorBefore: true,
      onSelect: actions.openSettings,
    },
    ...group(t("Hjälp"), helpItems(help, actions.sendFeedback)),
  ];
}
