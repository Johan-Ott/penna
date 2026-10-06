import type { AppState } from "../App.js";
import { useBackupsDialog } from "../backups/BackupsDialog.js";
import { useFeedbackDialog } from "../feedback/FeedbackDialog.js";
import { useMenuButton } from "../Menu.js";
import { useRevisionImport } from "../review/RevisionImport.js";
import { HELP_TAB } from "../settings/SettingsDialog.js";
import type { Project } from "../useProject.js";
import { openIfOnDisk } from "../useSceneSession.js";
import { useShortcut } from "../useShortcut.js";
import { appMenu } from "./appMenu.js";
import { t } from "../../i18n/i18n.js";

// The dialogs the menu opens come with it.
function useMenuDialogs({ app, project }: { app: AppState; project: Project }) {
  const dirs = [project.dir, app.series?.dir].filter((dir) => dir !== undefined);
  const backups = useBackupsDialog(app, dirs);
  const feedback = useFeedbackDialog();
  const revision = useRevisionImport(project, app.revision.reload, (id) =>
    openIfOnDisk(app.session, project, id),
  );
  const layers = (
    <>
      {backups.layer}
      {feedback.layer}
      {revision.layer}
    </>
  );
  return { backups, feedback, revision, layers };
}

/** The open book's menu, with the dialogs it opens. */
export function useAppMenu({ app, project }: { app: AppState; project: Project }) {
  const { backups, feedback, revision, layers: dialogs } = useMenuDialogs({ app, project });
  const showShelf = () => void app.showShelf();
  useShortcut("o", showShelf, { shift: true });
  const items = appMenu({
    showShelf,
    newProject: () => {
      app.newProjectAsked.current = true;
      showShelf();
    },
    openFolder: () => void app.choose(),
    showVersions: app.scene ? () => app.snapshots.show(app.scene?.id ?? "") : null,
    exportZip: app.zip.backup,
    importRevision: revision.open,
    showBackups: backups.open,
    sendFeedback: feedback.open,
    openSettings: () => app.writingMode.settingsDialog.open(),
    openShortcuts: () => app.writingMode.settingsDialog.open(HELP_TAB),
  });
  const menu = useMenuButton(t("Meny"), items);
  const layers = (
    <>
      {menu.menu}
      {dialogs}
    </>
  );
  return { open: menu.open, menu: layers };
}
