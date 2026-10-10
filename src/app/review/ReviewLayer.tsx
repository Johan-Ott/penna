import { useEffect, useRef } from "react";
import type { Node } from "prosemirror-model";
import { SearchQuery } from "prosemirror-search";
import type { NameSuspect } from "../../manuscript/review.js";
import type { AppState } from "../App.js";
import type { OpenScene } from "../sceneSession.js";
import type { Project } from "../useProject.js";
import { narrationOf } from "../../manuscript/narration.js";
import { fadingPeople } from "../../project/fadingPeople.js";
import { NarrationPicker } from "./NarrationPicker.js";
import { ReviewPanel } from "./ReviewPanel.js";
import { useReview } from "./useReview.js";
import { documentText } from "../../editor/documentText.js";
import { CommentsSection } from "./CommentsSection.js";
import { BookTasks } from "./BookTasks.js";
import { SceneSecretWarnings } from "../notes/SecretPanel.js";
import { sidebarProps } from "../paneProps.js";
import { RevisionSection } from "./RevisionSection.js";
import type { useComments } from "./useComments.js";
import { t } from "../../i18n/i18n.js";

type Comments = ReturnType<typeof useComments>;

// Only whole words with the same capital letters change; Ångra undoes all of it in one step.
const replaceAllQuery = (suspect: NameSuspect) =>
  new SearchQuery({
    search: suspect.word,
    replace: suspect.suggestion,
    wholeWord: true,
    caseSensitive: true,
  });

type ShownProps = {
  app: AppState;
  project: Project;
  scene: OpenScene;
  doc: Node;
  comments: Comments;
};

// The open scene's comments, then what is still open elsewhere in the book.
function CommentsAndTasks(props: ShownProps) {
  return (
    <>
      <CommentsSection comments={props.comments} text={documentText(props.doc).text} />
      <SceneSecretWarnings
        book={props.project}
        sceneId={props.scene.id}
        notes={props.app.notes}
        onOpen={sidebarProps(props.app, props.project).onOpenScene}
      />
      <BookTasks
        project={props.project}
        openSceneId={props.scene.id}
        comments={props.comments.comments}
        onOpen={sidebarProps(props.app, props.project).onOpenScene}
      />
    </>
  );
}

// Opened while a comment is written, and closed once it is sent if it then stands in the margin.
// Opened by itself for an editor's changes, too, so they are seen.
function useOpening(app: AppState, isWriting: boolean) {
  const { setReviewOpen, settings } = app.writingMode;
  const hasRevision = app.revision.isOpen;
  const wasWriting = useRef(false);
  useEffect(() => {
    if (isWriting || hasRevision) setReviewOpen(true);
    else if (wasWriting.current && settings.commentsInMargin) setReviewOpen(false);
    wasWriting.current = isWriting;
  }, [isWriting, hasRevision, setReviewOpen, settings.commentsInMargin]);
}

function NarrationSection({ app, fields }: { app: AppState; fields: Record<string, unknown> }) {
  const narration = narrationOf(fields);
  return (
    <section className="review-section">
      <span className="review-heading">{t("Berättarröst")}</span>
      <NarrationPicker
        value={narration}
        onChange={(next) => void app.updateFields({ narration: next })}
      />
      {!narration && (
        <span className="setting-hint">
          {t("Välj hur boken berättas, så ser Granska till att texten håller sig till det.")}
        </span>
      )}
    </section>
  );
}

function ShownReview(props: ShownProps) {
  const { app } = props;
  const { review: isReviewOn, repeatWindow } = app.writingMode.settings;
  const review = useReview({ ...props, cards: app.notes.cards, repeatWindow });
  useOpening(app, props.comments.draft !== null);
  return (
    <ReviewPanel
      review={isReviewOn ? review : null}
      commentsSection={<CommentsAndTasks {...props} />}
      narrationSection={<NarrationSection app={app} fields={props.project.fields} />}
      bookNotes={fadingPeople(app.notes.cards, app.notes.mentions, props.project.tree)}
      revisionSection={<RevisionSection revision={app.revision} />}
      revisionCount={app.revision.changes.length}
      repeatWindow={repeatWindow}
      onOpenCard={app.cards.open}
      onReplaceAll={(suspect) => app.search.scope.replaceAll(replaceAllQuery(suspect))}
      onIgnore={(word) => void app.updateFields({ ignoredNames: [...review.ignored, word] })}
      isPinnedOpen={props.comments.draft !== null}
      commentCount={props.comments.comments.length}
      isOpen={app.writingMode.isReviewOpen}
      onOpenChange={app.writingMode.setReviewOpen}
      onCount={app.writingMode.setReviewCount}
    />
  );
}

// Shown with Granskning on, or whenever there is something from someone else to read.
function isWanted({ writingMode, comments, revision }: AppState) {
  const hasComments = comments.comments.length > 0 || comments.draft !== null;
  return writingMode.settings.review || hasComments || revision.isOpen;
}

export function ReviewLayer({ app, project }: { app: AppState; project: Project }) {
  const { scene, writingMode, comments } = app;
  const doc = app.editor.editorState?.doc;
  if (!isWanted(app) || writingMode.isFocusMode || !scene || !doc) return null;
  return <ShownReview app={app} project={project} scene={scene} doc={doc} comments={comments} />;
}
