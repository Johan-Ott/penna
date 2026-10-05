import { useCallback, useEffect, useRef } from "react";
import { manuscriptSceneIds } from "../../project/tree.js";
import { chapterOf } from "../../project/treeLabels.js";
import type { AppState } from "../App.js";
import { NewNoteDialog } from "../notes/NewNoteDialog.js";
import { openInHome } from "../notes/noteHomes.js";
import { Overlays } from "../Overlays.js";
import { writingAreaProps } from "../paneProps.js";
import { ProgressPopover } from "../progress/ProgressPopover.js";
import { BackIcon, SearchIcon } from "../shell/icons.js";
import { ReviewButton } from "../shell/Topbar.js";
import type { Project } from "../useProject.js";
import { WritingArea } from "../WritingArea.js";
import { PhoneBook } from "./PhoneBook.js";
import { PhoneSort } from "./PhoneSort.js";
import { usePhoneNavigation, type PhoneScreen } from "./usePhoneNavigation.js";
import { numberLocale, t } from "../../i18n/i18n.js";

type Props = { app: AppState; project: Project };

// Android's back button puts the keyboard away, so the bar has no Klar.
function TextBar({ app, project, onBack }: Props & { onBack: () => void }) {
  const scene = app.scene;
  const chapter = scene ? chapterOf(project.tree, scene.id) : null;
  const words = app.today.words.toLocaleString(numberLocale());
  return (
    <header className="phone-bar">
      <button className="topbar-button" aria-label={t("Tillbaka")} onClick={onBack}>
        <BackIcon />
      </button>
      <span className="phone-bar-title">
        <span>{chapter?.title ?? scene?.title ?? ""}</span>
        <span className="phone-bar-sub">{t("{count} ord idag", { count: words })}</span>
      </span>
      <span className="phone-bar-end">
        <ReviewButton
          review={app.writingMode.review}
          onReview={() => app.writingMode.setReviewOpen(!app.writingMode.isReviewOpen)}
        />
        <button className="topbar-button" aria-label={t("Sök")} onClick={app.palette.open}>
          <SearchIcon />
        </button>
      </span>
    </header>
  );
}

function Floating({ app, project }: Props) {
  const { writingMode } = app;
  const notes = (isInSeries: boolean) => (isInSeries ? app.actions.series : app.actions).notes;
  return (
    <>
      {writingMode.isProgressOpen && (
        <ProgressPopover
          project={project}
          stats={app.stats}
          onSaveGoals={(fields) => void app.updateFields(fields)}
          onClose={() => writingMode.setProgressOpen(false)}
        />
      )}
      {app.newNoteSort !== false && (
        <NewNoteDialog
          project={project}
          series={app.series}
          sortId={app.newNoteSort}
          onCreate={(note, isInSeries) => void notes(isInSeries).newNote(note)}
          onClose={() => app.setNewNoteSort(false)}
        />
      )}
      <Overlays app={app} />
    </>
  );
}

// The text a book opens with at the start stays behind Boken; later texts get a screen each.
function useTextFollowsScene(
  sceneId: string | null,
  screen: PhoneScreen,
  showText: (id: string) => void,
) {
  const last = useRef<string | null>(null);
  useEffect(() => {
    const isShown = screen.kind === "text" && screen.sceneId === sceneId;
    if (last.current !== null && sceneId !== null && sceneId !== last.current && !isShown) {
      showText(sceneId);
    }
    if (sceneId !== null) last.current = sceneId;
  }, [sceneId, screen, showText]);
}

function useScreenOpensText(app: AppState, screen: PhoneScreen) {
  const appRef = useRef(app);
  appRef.current = app;
  useEffect(() => {
    const { session, homes, scene } = appRef.current;
    if (screen.kind === "text" && screen.sceneId !== scene?.id) {
      openInHome(session, homes, screen.sceneId);
    }
  }, [screen]);
}

function usePhoneScreens({ app, project }: Props) {
  const navigation = usePhoneNavigation();
  const { show, screen } = navigation;
  const showText = useCallback((sceneId: string) => show({ kind: "text", sceneId }), [show]);
  useTextFollowsScene(app.scene?.id ?? null, screen, showText);
  useScreenOpensText(app, screen);
  // Granska covers the whole screen, so it closes when another text or screen shows.
  const { setReviewOpen } = app.writingMode;
  useEffect(() => setReviewOpen(false), [screen, app.scene?.id, setReviewOpen]);
  const openText = (id: string) =>
    id === app.scene?.id ? showText(id) : openInHome(app.session, app.homes, id);
  const continueWriting = () => {
    const first = manuscriptSceneIds(project.tree)[0];
    if (app.scene) showText(app.scene.id);
    else if (first) openText(first);
  };
  return { ...navigation, openText, continueWriting };
}

export function PhoneProject({ app, project }: Props) {
  const screens = usePhoneScreens({ app, project });
  const { screen } = screens;
  return (
    <div className="phone-app">
      {screen.kind === "book" && (
        <PhoneBook
          app={app}
          project={project}
          onOpenText={screens.openText}
          onContinue={screens.continueWriting}
          onSort={(sortId) => screens.show({ kind: "sort", sortId })}
        />
      )}
      {screen.kind === "sort" && (
        <PhoneSort
          app={app}
          sortId={screen.sortId}
          onOpen={screens.openText}
          onBack={screens.back}
        />
      )}
      <div className={screen.kind === "text" ? "phone-text" : "phone-text hidden"}>
        <TextBar app={app} project={project} onBack={screens.back} />
        <WritingArea {...writingAreaProps(app, project)} />
      </div>
      <Floating app={app} project={project} />
    </div>
  );
}
