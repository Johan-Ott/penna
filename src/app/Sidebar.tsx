import type { SceneFileRef } from "../storage/syncFiles.js";
import { useMenuButton } from "./Menu.js";
import { ChevronDownIcon } from "./shell/icons.js";
import { SyncNotices } from "./SyncLayer.js";
import { addMenu } from "./tree/treeMenus.js";
import { TreeView, type TreeViewProps } from "./tree/TreeView.js";
import { t } from "../i18n/i18n.js";

interface SidebarProps extends TreeViewProps {
  isContentsShown: boolean;
  onShowContents: () => void;
  onShowShelf: () => void;
  onShowSyncCopy: (copy: SceneFileRef) => void;
}

// The book's title opens Innehåll; the chevron adds to the book or goes back to the shelf.
function BookTitle(props: SidebarProps) {
  const menu = useMenuButton(t("Lägg till"), [
    ...addMenu({ add: props.onAdd }),
    { label: t("Bokhylla"), separatorBefore: true, onSelect: props.onShowShelf },
  ]);
  return (
    <div className={props.isContentsShown ? "book-title-row chosen" : "book-title-row"}>
      <button className="book-title-button" onClick={props.onShowContents}>
        {props.project.name}
      </button>
      <button
        className="book-title-menu"
        aria-label={t("Lägg till")}
        aria-haspopup="menu"
        onClick={menu.open}
      >
        <ChevronDownIcon />
      </button>
      {menu.menu}
    </div>
  );
}

/** The book: its title, the manuscript, the notes in their sorts, and Papperskorg at the bottom. */
export function Sidebar(props: SidebarProps) {
  return (
    <nav className="sidebar" aria-label={t("Boken")}>
      <BookTitle {...props} />
      <TreeView {...props} />
      <SyncNotices project={props.project} onShowSyncCopy={props.onShowSyncCopy} />
    </nav>
  );
}
