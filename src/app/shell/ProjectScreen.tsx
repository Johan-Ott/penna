import type { MouseEvent } from "react";
import type { AppState } from "../App.js";
import { ContentsView } from "../contents/ContentsView.js";
import { ReadView } from "../contents/ReadView.js";
import { cursorAtBlock } from "../../editor/commands.js";
import { openScene } from "../sceneSession.js";
import { NewNoteDialog } from "../notes/NewNoteDialog.js";
import { Overlays } from "../Overlays.js";
import { ProgressPopover } from "../progress/ProgressPopover.js";
import { PublishView } from "../publish/PublishView.js";
import { Sidebar } from "../Sidebar.js";
import { openIfOnDisk } from "../useSceneSession.js";
import type { Project } from "../useProject.js";
import { useShortcut } from "../useShortcut.js";
import { WritingArea } from "../WritingArea.js";
import { sidebarProps, writingAreaProps } from "../paneProps.js";
import { Topbar } from "./Topbar.js";
import { useAppMenu } from "./useAppMenu.js";
import { useNavigation, type Place } from "./useNavigation.js";
import type { PageMap } from "../../project/pageMap.js";
import { scenePagesOf, usePageMap } from "../usePageMap.js";
import { t } from "../../i18n/i18n.js";

type ScreenProps = { app: AppState; project: Project };

// A failed export names the scene by title, so it is found by its title.
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

function openAt(app: AppState, project: Project, sceneId: string, blockIndex: number) {
  app.writingMode.setView("skriv");
  void openScene(app.session, project.dir, sceneId).then(
    (isOpen) => isOpen && app.editor.run(cursorAtBlock(blockIndex)),
  );
}

function Contents({ app, project, pageMap }: ScreenProps & { pageMap: PageMap | null }) {
  return (
    <ContentsView
      project={project}
      pageMap={pageMap}
      onOpenScene={sidebarProps(app, project).onOpenScene}
      onChangeTree={(tree) => void app.updateTree(tree)}
      onSaveFields={(fields) => void app.updateFields(fields)}
      onSetStatus={(ids, status) =>
        ids.forEach((id) => app.treeHandlers.onSetSceneStatus(id, status))
      }
      onReadBook={() => app.writingMode.read(null)}
    />
  );
}

function MainCard({ app, project }: ScreenProps) {
  const { writingMode } = app;
  const isCounting = writingMode.view === "innehall" || writingMode.settings.showPages;
  const pageMap = usePageMap(project, app.startup.preferences.authorName, isCounting);
  return (
    <div className={writingMode.view === "publicera" ? "main-card hidden" : "main-card"}>
      <WritingArea {...writingAreaProps(app, project)} scenePages={scenePagesOf(app, pageMap)} />
      {writingMode.view === "innehall" && (
        <Contents app={app} project={project} pageMap={pageMap} />
      )}
      {writingMode.view === "las" && (
        <ReadView
          project={project}
          chapterId={writingMode.readChapterId}
          settings={writingMode.settings}
          onOpenAt={(sceneId, blockIndex) => openAt(app, project, sceneId, blockIndex)}
          onBack={() => writingMode.setView("skriv")}
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
          series={app.series}
          sortId={app.newNoteSort}
          onCreate={(note, isInSeries) => {
            writingMode.setView("skriv");
            void (isInSeries ? app.actions.series : app.actions).notes.newNote(note);
          }}
          onClose={() => app.setNewNoteSort(false)}
        />
      )}
      <Overlays app={app} />
    </>
  );
}

export function ProjectScreen({ app, project }: ScreenProps) {
  const { writingMode } = app;
  const menu = useAppMenu({ app, project });
  useShortcut("enter", app.sceneSplit.split, { shift: true });
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
