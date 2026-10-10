import { useState, type ReactNode } from "react";
import { SeriesDialog } from "./notes/SeriesDialog.js";
import { useMenuButton } from "./Menu.js";
import { ChevronDownIcon, ContentsIcon } from "./shell/icons.js";
import { SyncNotices } from "./SyncLayer.js";
import { ThemeDialog } from "./themes/ThemeDialog.js";
import { TemplatesDialog } from "./templates/TemplatesDialog.js";
import { themeField } from "./themes/themeStyle.js";
import { addMenu } from "./tree/treeMenus.js";
import { TreeView, type TreeViewProps } from "./tree/TreeView.js";
import { t } from "../i18n/i18n.js";

type BookDialogProps = Pick<SidebarProps, "project" | "libraryDir" | "onUpdateProject">;

interface SidebarProps extends TreeViewProps {
  profile: ReactNode;
  /** The Penna folder, where the writer's own templates are kept. */
  libraryDir: string | null;
  seriesNotes: ReactNode;
  onJoinSeries: (folder: string | null) => void;
  onCreateSeries: (title: string, noteIds: string[]) => void;
  isContentsShown: boolean;
  onShowContents: () => void;
  onShowShelf: () => void;
  syncReviewCount: number;
  onShowSyncReview: () => void;
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

/** Tema…, shared with the phone's book menu. */
export function useThemeDialog(props: BookDialogProps) {
  const [isOpen, setOpen] = useState(false);
  const dialog = isOpen && (
    <ThemeDialog
      fields={props.project.fields}
      onSave={(theme) => props.onUpdateProject?.({ fields: { theme: themeField(theme) } })}
      onClose={() => setOpen(false)}
    />
  );
  return { open: () => setOpen(true), dialog };
}

/** Mallar och bitar…, shared with the phone's book menu. */
export function useTemplatesDialog(props: BookDialogProps) {
  const [isOpen, setOpen] = useState(false);
  const dialog = isOpen && props.onUpdateProject && (
    <TemplatesDialog
      project={props.project}
      libraryDir={props.libraryDir}
      onUpdate={props.onUpdateProject}
      onClose={() => setOpen(false)}
    />
  );
  return { open: () => setOpen(true), dialog };
}

// Innehåll beside the book's title, so the book's overview is one click away.
const ContentsButton = ({ onShow }: { onShow: () => void }) => (
  <button
    className="book-title-menu contents"
    aria-label={t("Innehåll")}
    title={t("Innehåll · G I")}
    onClick={onShow}
  >
    <ContentsIcon />
  </button>
);

type Opens = Record<"series" | "theme" | "templates", { open: () => void }>;

const bookMenu = (props: SidebarProps, dialogs: Opens) => [
  ...addMenu({ add: props.onAdd }),
  { label: t("Serie…"), separatorBefore: true, onSelect: dialogs.series.open },
  { label: t("Tema…"), onSelect: dialogs.theme.open },
  { label: t("Mallar och bitar…"), onSelect: dialogs.templates.open },
  { label: t("Bokhylla"), onSelect: props.onShowShelf },
];

function BookTitle(props: SidebarProps) {
  const series = useSeriesDialog(props);
  const theme = useThemeDialog(props);
  const templates = useTemplatesDialog(props);
  const menu = useMenuButton(t("Lägg till"), bookMenu(props, { series, theme, templates }));
  return (
    <div className={props.isContentsShown ? "book-title-row chosen" : "book-title-row"}>
      <button className="book-title-button" onClick={props.onShowContents}>
        {props.project.name}
      </button>
      <ContentsButton onShow={props.onShowContents} />
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
      {theme.dialog}
      {templates.dialog}
    </div>
  );
}

export function Sidebar(props: SidebarProps) {
  return (
    <nav className="sidebar" aria-label={t("Boken")}>
      {props.profile}
      <BookTitle {...props} />
      <TreeView {...props} />
      <SyncNotices
        project={props.project}
        reviewCount={props.syncReviewCount}
        onShowReview={props.onShowSyncReview}
      />
    </nav>
  );
}
