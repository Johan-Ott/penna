import type { MouseEvent } from "react";
import type { AppState } from "../App.js";
import { NewNoteDialog } from "../notes/NewNoteDialog.js";
import { Overlays } from "../Overlays.js";
import { InsightsLayer } from "../progress/InsightsPanel.js";
import { ResumeScreen } from "../resume/ResumeScreen.js";
import { ProfileLayer } from "../profile/ProfileLayer.js";
import { themeStyle } from "../themes/themeStyle.js";
import { Sidebar } from "../Sidebar.js";
import { openIfOnDisk } from "../useSceneSession.js";
import type { Project } from "../useProject.js";
import { useShortcut } from "../useShortcut.js";
import { WritingArea } from "../WritingArea.js";
import { sidebarProps, writingAreaProps } from "../paneProps.js";
import { ContentsScreen, PublishScreen, ReadScreen, SyncScreen } from "./bookViews.js";
import { ReviewPill, Topbar } from "./Topbar.js";
import { useAppMenu } from "./useAppMenu.js";
import { useNavigation, type Place } from "./useNavigation.js";
import { folioOf, pageFinder, scenePagesOf, usePageMap } from "../usePageMap.js";
import type { PageMap } from "../../project/pageMap.js";
import { chapterOf } from "../../project/treeLabels.js";
import { t } from "../../i18n/i18n.js";

type ScreenProps = { app: AppState; project: Project };

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
      // The button took the cursor from the text; it goes back there, where the writer was.
      onFocus={() => (writingMode.onToggleFocus(), app.editor.requestFocus())}
      onRead={() => writingMode.read(null)}
    />
  );
}

// In Skriv: the Granska pill, and the opening picture when a book opens where you left off.
function OverTheText({ app, project }: ScreenProps) {
  const { writingMode } = app;
  return (
    <>
      {!writingMode.isReviewOpen && (
        <ReviewPill review={writingMode.review} onReview={() => writingMode.setReviewOpen(true)} />
      )}
      <ResumeScreen project={project} stats={app.stats} editor={app.editor} />
    </>
  );
}

// The open scene's pages: marks in the margin, the sheet's foot, and whether it opens a chapter.
const pageParts = (app: AppState, project: Project, pageMap: PageMap | null) => ({
  scenePages: scenePagesOf(app, pageMap),
  folio: folioOf(app.scene?.id ?? null, pageMap),
  opensChapter: app.scene ? chapterOf(project.tree, app.scene.id)?.isFirstScene === true : false,
});

// The printed book's pages, counted while Innehåll, the sheet or the table of contents shows them.
function useScreenPages({ app, project }: ScreenProps) {
  const { view, settings } = app.writingMode;
  const isCounting =
    view === "innehall" || settings.showPages || settings.paper || settings.tableOfContents;
  return usePageMap(project, app.startup.preferences.authorName, isCounting);
}

function MainCard({ app, project, pageMap }: ScreenProps & { pageMap: PageMap | null }) {
  const { writingMode } = app;
  const views = { app, project, onBack: () => writingMode.setView("skriv") };
  return (
    <div className={writingMode.view === "publicera" ? "main-card hidden" : "main-card"}>
      <WritingArea {...writingAreaProps(app, project)} {...pageParts(app, project, pageMap)} />
      {writingMode.view === "skriv" && <OverTheText app={app} project={project} />}
      {writingMode.view === "innehall" && (
        <ContentsScreen app={app} project={project} pageMap={pageMap} />
      )}
      {writingMode.view === "synk" && <SyncScreen {...views} />}
      {writingMode.view === "las" && <ReadScreen {...views} />}
    </div>
  );
}

function Floating({ app, project }: ScreenProps) {
  const { writingMode } = app;
  return (
    <>
      <InsightsLayer app={app} project={project} />
      <ProfileLayer app={app} project={project} />
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
  useShortcut("r", () => app.writingMode.read(null));
  const isPublishing = writingMode.view === "publicera";
  const pageMap = useScreenPages({ app, project });
  const pageOf = writingMode.settings.tableOfContents
    ? pageFinder(pageMap, project.tree)
    : undefined;
  const classes = [
    "app",
    writingMode.isFocusMode && "focus-mode",
    writingMode.isProgressOpen && "insights-open",
    writingMode.isSidebarOpen && !isPublishing ? "sidebar-open" : "sidebar-closed",
  ];
  return (
    <div className={classes.filter(Boolean).join(" ")} style={themeStyle(project.fields)}>
      <ScreenTopbar app={app} project={project} onMenu={menu.open} />
      {!isPublishing && <Sidebar {...sidebarProps(app, project)} pageOf={pageOf} />}
      <div className="sidebar-backdrop" onClick={() => writingMode.setSidebarOpen(false)} />
      <MainCard app={app} project={project} pageMap={pageMap} />
      {isPublishing && (
        <PublishScreen app={app} project={project} onBack={() => writingMode.setView("skriv")} />
      )}
      <Floating app={app} project={project} />
      {menu.menu}
    </div>
  );
}
