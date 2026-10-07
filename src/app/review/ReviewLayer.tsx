import { useEffect } from "react";
import type { Node } from "prosemirror-model";
import { SearchQuery } from "prosemirror-search";
import type { NameSuspect } from "../../manuscript/review.js";
import type { AppState } from "../App.js";
import type { OpenScene } from "../sceneSession.js";
import type { Project } from "../useProject.js";
import { ReviewPanel } from "./ReviewPanel.js";
import { useReview } from "./useReview.js";
import { documentText } from "../../editor/documentText.js";
import { CommentsSection } from "./CommentsSection.js";
import { BookTasks } from "./BookTasks.js";
import { sidebarProps } from "../paneProps.js";
import { RevisionSection } from "./RevisionSection.js";
import type { useComments } from "./useComments.js";

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
      <BookTasks
        project={props.project}
        openSceneId={props.scene.id}
        comments={props.comments.comments}
        onOpen={sidebarProps(props.app, props.project).onOpenScene}
      />
    </>
  );
}

function ShownReview(props: ShownProps) {
  const { app } = props;
  const { review: isReviewOn, repeatWindow } = app.writingMode.settings;
  const review = useReview({ ...props, cards: app.notes.cards, repeatWindow });
  const isWriting = props.comments.draft !== null;
  const { setReviewOpen } = app.writingMode;
  // Opened while a comment is written, so the comment is still in view once it is sent.
  // Opened by itself for an editor's changes, too, so they are seen.
  const hasRevision = app.revision.isOpen;
  useEffect(() => {
    if (isWriting || hasRevision) setReviewOpen(true);
  }, [isWriting, hasRevision, setReviewOpen]);
  return (
    <ReviewPanel
      review={isReviewOn ? review : null}
      commentsSection={<CommentsAndTasks {...props} />}
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
