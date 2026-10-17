import { useTemplatesDialog, useThemeDialog } from "../Sidebar.js";
import { collaborationItems } from "../exporting/collaboration.js";
import { useState } from "react";
import type { AppState } from "../App.js";
import { SeriesDialog } from "../notes/SeriesDialog.js";
import { useBackupsDialog } from "../backups/BackupsDialog.js";
import { useFeedbackDialog } from "@llkit/feedback/FeedbackDialog.js";
import { useMenuButton } from "@llkit/Menu.js";
import { useRevisionImport } from "../review/RevisionImport.js";
import { HELP_TAB } from "../settings/SettingsDialog.js";
import type { Project } from "../useProject.js";
import { openIfOnDisk } from "../useSceneSession.js";
import { useCommandKey } from "../shortcuts.js";
import { appMenu } from "./appMenu.js";
import { t } from "../../i18n/i18n.js";

// Serie… is in the sidebar's book menu on a computer, and in the menu on a phone.
function useSeriesChoice(app: AppState, project: Project) {
  const [isOpen, setOpen] = useState(false);
  const layer = isOpen && (
    <SeriesDialog
      book={project}
      onJoin={(folder, number) => void app.seriesChoice.joinSeries(folder, number)}
      onCreate={(title, noteIds, number) =>
        void app.seriesChoice.createAndJoin(title, noteIds, number)
      }
      onClose={() => setOpen(false)}
    />
  );
  return { open: () => setOpen(true), layer };
}

// The dialogs the menu opens come with it.
export function useMenuDialogs({ app, project }: { app: AppState; project: Project }) {
  const dirs = [project.dir, app.series?.dir].filter((dir) => dir !== undefined);
  const backups = useBackupsDialog(app, dirs);
  const feedback = useFeedbackDialog();
  // Read anew after the file, so the new comments show in Granska at once.
  const afterRead = () => (app.revision.reload(), void app.refresh());
  const revision = useRevisionImport(project, afterRead, (id) =>
    openIfOnDisk(app.session, project, id),
  );
  const series = useSeriesChoice(app, project);
  const { libraryDir } = app.startup.preferences;
  const bookProps = {
    project,
    libraryDir,
    onUpdateProject: (change: Parameters<typeof app.updateProject>[0]) =>
      void app.updateProject(change),
  };
  const theme = useThemeDialog(bookProps);
  const templates = useTemplatesDialog(bookProps);
  const layers = (
    <>
      {theme.dialog}
      {templates.dialog}
      {backups.layer}
      {feedback.layer}
      {revision.layer}
      {series.layer}
    </>
  );
  return { backups, feedback, revision, series, theme, templates, layers };
}

// Bokhylla and Ny bok, by the menu and by their keys; a new book is made from the shelf.
function useShelfKeys(app: AppState) {
  const showShelf = () => void app.showShelf();
  const newProject = () => {
    app.newProjectAsked.current = true;
    showShelf();
  };
  useCommandKey("shelf", showShelf);
  useCommandKey("newBook", newProject);
  return { showShelf, newProject };
}

// The book's own, as the phone's menu has them under Boken.
const bookItems = (dialogs: ReturnType<typeof useMenuDialogs>) => [
  { label: t("Tema…"), onSelect: dialogs.theme.open },
  { label: t("Serie…"), onSelect: dialogs.series.open },
  { label: t("Mallar och bitar…"), onSelect: dialogs.templates.open },
];

/** The open book's menu, with the dialogs it opens. */
export function useAppMenu({ app, project }: { app: AppState; project: Project }) {
  const dialogs = useMenuDialogs({ app, project });
  const { backups, feedback, revision } = dialogs;
  const { showShelf, newProject } = useShelfKeys(app);
  const items = appMenu({
    showShelf,
    newProject,
    openFolder: () => void app.choose(),
    showVersions: app.scene ? () => app.snapshots.show(app.scene?.id ?? "") : null,
    exportZip: app.zip.backup,
    importRevision: revision.open,
    sharing: collaborationItems(project, app.zip.run),
    showBackups: backups.open,
    sendFeedback: feedback.open,
    book: bookItems(dialogs),
    openSettings: () => app.writingMode.settingsDialog.open(),
    openShortcuts: () => app.writingMode.settingsDialog.open(HELP_TAB),
  });
  const menu = useMenuButton(t("Meny"), items);
  const layers = (
    <>
      {menu.menu}
      {dialogs.layers}
    </>
  );
  return { open: menu.open, menu: layers };
}
