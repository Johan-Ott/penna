import type { AppState } from "../App.js";
import { ContentsView } from "../contents/ContentsView.js";
import { ReadView } from "../contents/ReadView.js";
import { cursorAtBlock } from "../../editor/commands.js";
import { sidebarProps } from "../paneProps.js";
import { PublishView } from "../publish/PublishView.js";
import { openScene } from "../sceneSession.js";
import { SyncView } from "../sync/SyncReview.js";
import { openIfOnDisk } from "../useSceneSession.js";
import type { Project } from "../useProject.js";
import type { PageMap } from "../../project/pageMap.js";

// Innehåll, Läs, Publicera and Från synken: the same on the computer and on a phone, where
// only the way back and the way into a text differ.

export interface ViewProps {
  app: AppState;
  project: Project;
  onBack: () => void;
}

// A failed export names the scene by title, so it is found by its title.
function openSceneTitled(app: AppState, project: Project, title: string) {
  const id = Object.keys(project.summaries).find((key) => project.summaries[key]?.title === title);
  if (!id) return;
  app.writingMode.setView("skriv");
  openIfOnDisk(app.session, project, id);
}

function openAt(app: AppState, project: Project, sceneId: string, blockIndex: number) {
  app.writingMode.setView("skriv");
  void openScene(app.session, project.dir, sceneId).then(
    (isOpen) => isOpen && app.editor.run(cursorAtBlock(blockIndex)),
  );
}

export function ContentsScreen(
  props: Omit<ViewProps, "onBack"> & {
    pageMap: PageMap | null;
    onOpenScene?: (id: string) => void;
  },
) {
  const { app, project } = props;
  return (
    <ContentsView
      project={project}
      pageMap={props.pageMap}
      onOpenScene={props.onOpenScene ?? sidebarProps(app, project).onOpenScene}
      onChangeTree={(tree) => void app.updateTree(tree)}
      onSaveFields={(fields) => void app.updateFields(fields)}
      onSetStatus={(ids, status) =>
        ids.forEach((id) => app.treeHandlers.onSetSceneStatus(id, status))
      }
      onReadBook={() => app.writingMode.read(null)}
      onShowDrafts={() => app.drafts.show(null)}
    />
  );
}

export function ReadScreen({ app, project, onBack }: ViewProps) {
  const { writingMode } = app;
  return (
    <ReadView
      project={project}
      chapterId={writingMode.readChapterId}
      settings={writingMode.settings}
      onOpenAt={(sceneId, blockIndex) => openAt(app, project, sceneId, blockIndex)}
      onBack={onBack}
      beforeRead={app.session.autosave.flush}
    />
  );
}

export function PublishScreen({ app, project, onBack }: ViewProps) {
  return (
    <PublishView
      project={project}
      generalAuthor={app.startup.preferences.authorName}
      onSaveFields={(fields) => void app.updateFields(fields)}
      onOpenScene={(title) => openSceneTitled(app, project, title)}
      onBack={onBack}
    />
  );
}

export const SyncScreen = ({ app, project, onBack }: ViewProps) => (
  <SyncView project={project} review={app.syncReview} onBack={onBack} />
);
