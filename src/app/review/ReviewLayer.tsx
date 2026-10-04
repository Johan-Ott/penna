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
import type { useComments } from "./useComments.js";

type Comments = ReturnType<typeof useComments>;

// "Ändra alla" replaces the name in the whole manuscript, with Ångra in one step as the spec
// asks; only whole words with the same capital letters are changed.
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

function ShownReview(props: ShownProps) {
  const { app } = props;
  const { review: isReviewOn, repeatWindow } = app.writingMode.settings;
  const review = useReview({ ...props, cards: app.notes.cards, repeatWindow });
  return (
    <ReviewPanel
      review={isReviewOn ? review : null}
      commentsSection={
        <CommentsSection comments={props.comments} text={documentText(props.doc).text} />
      }
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

/** Granska beside the text, while writing a scene with Granskning on or comments on it. */
export function ReviewLayer({ app, project }: { app: AppState; project: Project }) {
  const { scene, writingMode, comments } = app;
  const doc = app.editor.editorState?.doc;
  const hasComments = comments.comments.length > 0 || comments.draft !== null;
  const isWanted = writingMode.settings.review || hasComments;
  if (!isWanted || writingMode.isFocusMode || !scene || !doc) return null;
  return <ShownReview app={app} project={project} scene={scene} doc={doc} comments={comments} />;
}
