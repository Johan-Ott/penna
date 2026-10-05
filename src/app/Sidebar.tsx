import { useState, type ReactNode } from "react";
import { SeriesDialog } from "./notes/SeriesDialog.js";
import type { SceneFileRef } from "../storage/syncFiles.js";
import { useMenuButton } from "./Menu.js";
import { ChevronDownIcon } from "./shell/icons.js";
import { SyncNotices } from "./SyncLayer.js";
import { addMenu } from "./tree/treeMenus.js";
import { TreeView, type TreeViewProps } from "./tree/TreeView.js";
import { t } from "../i18n/i18n.js";

interface SidebarProps extends TreeViewProps {
  seriesNotes: ReactNode;
  onJoinSeries: (folder: string | null) => void;
  onCreateSeries: (title: string, noteIds: string[]) => void;
  isContentsShown: boolean;
  onShowContents: () => void;
  onShowShelf: () => void;
  onShowSyncCopy: (copy: SceneFileRef) => void;
}

function useSeriesDialog(props: SidebarProps) {
  const [isOpen, setOpen] = useState(false);
  const dialog = isOpen && (
    <SeriesDialog
      book={props.project}
      onJoin={props.onJoinSeries}
      onCreate={props.onCreateSeries}
      onClose={() => setOpen(false)}
    />
  );
  return { open: () => setOpen(true), dialog };
}

function BookTitle(props: SidebarProps) {
  const series = useSeriesDialog(props);
  const menu = useMenuButton(t("Lägg till"), [
    ...addMenu({ add: props.onAdd }),
    { label: t("Serie…"), separatorBefore: true, onSelect: series.open },
    { label: t("Bokhylla"), onSelect: props.onShowShelf },
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
      {series.dialog}
    </div>
  );
}

export function Sidebar(props: SidebarProps) {
  return (
    <nav className="sidebar" aria-label={t("Boken")}>
      <BookTitle {...props} />
      <TreeView {...props} />
      <SyncNotices project={props.project} onShowSyncCopy={props.onShowSyncCopy} />
    </nav>
  );
}
