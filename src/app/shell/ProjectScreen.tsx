import type { MouseEvent } from "react";
import type { AppState } from "../App.js";
import { ContentsView } from "../contents/ContentsView.js";
import { useMenuButton } from "../Menu.js";
import { NewNoteDialog } from "../notes/NewNoteDialog.js";
import { Overlays } from "../Overlays.js";
import { ProgressPopover } from "../progress/ProgressPopover.js";
import { PublishView } from "../publish/PublishView.js";
import { SHORTCUTS_TAB } from "../settings/SettingsDialog.js";
import { Sidebar } from "../Sidebar.js";
import { openIfOnDisk } from "../useSceneSession.js";
import type { Project } from "../useProject.js";
import { useShortcut } from "../useShortcut.js";
import { WritingArea } from "../WritingArea.js";
import { sidebarProps, writingAreaProps } from "../paneProps.js";
import { appMenu } from "./appMenu.js";
import { Topbar } from "./Topbar.js";
import { useNavigation, type Place } from "./useNavigation.js";
import { t } from "../../i18n/i18n.js";

type ScreenProps = { app: AppState; project: Project };

// "Gå till scenen" after a failed export: the scene is found by the title the error named.
function openSceneTitled(app: AppState, project: Project, title: string) {
  const id = Object.keys(project.summaries).find((key) => project.summaries[key]?.title === title);
  if (!id) return;
  app.writingMode.setView("skriv");
  openIfOnDisk(app.session, project, id);
}

function useScreenNavigation({ app, project }: ScreenProps) {
  const { writingMode, session } = app;
  const current: Place = { view: writingMode.view, sceneId: app.scene?.id ?? null };
  return useNavigation(current, (place) => {
    writingMode.setView(place.view);
    if (place.sceneId && place.sceneId !== session.scene?.id) {
      openIfOnDisk(session, project, place.sceneId);
    }
  });
}

function useAppMenu({ app }: ScreenProps) {
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
    openSettings: () => app.writingMode.settingsDialog.open(),
    openShortcuts: () => app.writingMode.settingsDialog.open(SHORTCUTS_TAB),
  });
  return useMenuButton(t("Meny"), items);
}

function ScreenTopbar(props: ScreenProps & { onMenu: (event: MouseEvent<HTMLElement>) => void }) {
  const { app, project } = props;
  const { writingMode } = app;
  const isPublishing = writingMode.view === "publicera";
  return (
    <Topbar
      view={writingMode.view}
      title={isPublishing ? t("Publicera {title}", { title: project.name }) : null}
      today={app.today}
      navigation={useScreenNavigation(props)}
      onMenu={props.onMenu}
      onToggleSidebar={writingMode.toggleSidebar}
      onView={writingMode.setView}
      onProgress={() => writingMode.setProgressOpen(true)}
      onSearch={app.palette.open}
      onFocus={writingMode.onToggleFocus}
      review={writingMode.review}
      onReview={() => writingMode.setReviewOpen(!writingMode.isReviewOpen)}
    />
  );
}

// The card in the middle: the text being written, with Innehåll laid over it when chosen.
function MainCard({ app, project }: ScreenProps) {
  const { writingMode } = app;
  const saveFields = (fields: Record<string, unknown>) => void app.updateFields(fields);
  return (
    <div className={writingMode.view === "publicera" ? "main-card hidden" : "main-card"}>
      <WritingArea {...writingAreaProps(app, project)} />
      {writingMode.view === "innehall" && (
        <ContentsView
          project={project}
          onOpenScene={sidebarProps(app, project).onOpenScene}
          onChangeTree={(tree) => void app.updateTree(tree)}
          onSaveFields={saveFields}
          onSetStatus={(ids, status) =>
            ids.forEach((id) => app.treeHandlers.onSetSceneStatus(id, status))
          }
        />
      )}
    </div>
  );
}

function Floating({ app, project }: ScreenProps) {
  const { writingMode } = app;
  const saveFields = (fields: Record<string, unknown>) => void app.updateFields(fields);
  return (
    <>
      {writingMode.isProgressOpen && (
        <ProgressPopover
          project={project}
          stats={app.stats}
          onSaveGoals={saveFields}
          onClose={() => writingMode.setProgressOpen(false)}
        />
      )}
      {app.newNoteSort !== false && (
        <NewNoteDialog
          project={project}
          sortId={app.newNoteSort}
          onCreate={(note) => {
            writingMode.setView("skriv");
            void app.actions.notes.newNote(note);
          }}
          onClose={() => app.setNewNoteSort(false)}
        />
      )}
      <Overlays app={app} />
    </>
  );
}

/** An open book: the top bar, the sidebar and the card, or Publicera in their place. */
export function ProjectScreen({ app, project }: ScreenProps) {
  const { writingMode } = app;
  const menu = useAppMenu({ app, project });
  const isPublishing = writingMode.view === "publicera";
  const classes = [
    "app",
    writingMode.isFocusMode && "focus-mode",
    writingMode.isSidebarOpen && !isPublishing ? "sidebar-open" : "sidebar-closed",
  ];
  return (
    <div className={classes.filter(Boolean).join(" ")}>
      <ScreenTopbar app={app} project={project} onMenu={menu.open} />
      {!isPublishing && <Sidebar {...sidebarProps(app, project)} />}
      <div className="sidebar-backdrop" onClick={() => writingMode.setSidebarOpen(false)} />
      <MainCard app={app} project={project} />
      {isPublishing && (
        <PublishView
          project={project}
          generalAuthor={app.startup.preferences.authorName}
          onSaveFields={(fields) => void app.updateFields(fields)}
          onOpenScene={(title) => openSceneTitled(app, project, title)}
          onBack={() => writingMode.setView("skriv")}
        />
      )}
      <Floating app={app} project={project} />
      {menu.menu}
    </div>
  );
}
