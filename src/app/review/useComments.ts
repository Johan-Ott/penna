import { useCallback, useEffect, useRef, useState } from "react";
import { refreshComments } from "../../editor/commentMarks.js";
import { documentText } from "../../editor/documentText.js";
import type { useEditorView } from "../../editor/useEditorView.js";
import {
  anchorAt,
  newComment,
  newReply,
  readComments,
  writeComments,
  type Anchor,
  type Comment,
} from "../../project/comments.js";
import { platform } from "../platform.js";
import type { OpenScene } from "../sceneSession.js";
import { useShortcut } from "../useShortcut.js";
import type { Project } from "../useProject.js";
import { t } from "../../i18n/i18n.js";

type Editor = ReturnType<typeof useEditorView>;

// The selected words, with a little text on either side; null when nothing is selected.
function selectedAnchor(editor: Editor): Anchor | null {
  const state = editor.viewRef.current?.state;
  if (!state || state.selection.empty) return null;
  const { text, fromDoc } = documentText(state.doc);
  return anchorAt(text, fromDoc(state.selection.from), fromDoc(state.selection.to));
}

// The open scene's comments file, written one change at a time and read again after.
function useCommentFile(project: Project | null, scene: OpenScene | null) {
  const [comments, setComments] = useState<Comment[]>([]);
  const queue = useRef(Promise.resolve());
  const dir = project?.dir ?? null;
  const sceneId = scene?.id ?? null;
  useEffect(() => {
    setComments([]);
    if (!dir || !sceneId) return;
    queue.current = queue.current.then(async () =>
      setComments(await readComments(platform.fileSystem, dir, sceneId)),
    );
  }, [project, dir, sceneId]);
  const save = (next: Comment[]) => {
    setComments(next);
    if (!dir || !sceneId) return;
    queue.current = queue.current
      .then(() => writeComments(platform.fileSystem, dir, sceneId, next))
      .catch(() => undefined);
  };
  return { comments, save };
}

// The open comments are marked in the text; a click on one shows it in the panel.
function useCommentMarks(editor: Editor, comments: Comment[], onComment: (id: string) => void) {
  editor.modes.current.commentAnchors = comments
    .filter((comment) => !comment.replyTo && !comment.resolved)
    .map((comment) => ({ id: comment.id, anchor: comment }));
  editor.modes.current.onComment = onComment;
  const { run } = editor;
  useEffect(() => run(refreshComments, false), [comments, run]);
}

/** Comments on the open scene: marked in the text, written, answered and resolved in the panel. */
export function useComments(parts: {
  project: Project | null;
  scene: OpenScene | null;
  editor: Editor;
  author: string;
}) {
  const { comments, save } = useCommentFile(parts.project, parts.scene);
  const [draft, setDraft] = useState<Anchor | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const { editor } = parts;
  useCommentMarks(editor, comments, setFocused);
  const start = useCallback(() => setDraft(selectedAnchor(editor)), [editor]);
  useShortcut("m", start, { shift: true });
  const author = parts.author || t("Du");
  return {
    comments,
    draft,
    focused,
    start,
    cancel: () => setDraft(null),
    add: (body: string) => {
      if (draft) save([...comments, newComment(draft, body, author)]);
      setDraft(null);
    },
    reply: (to: Comment, body: string) => save([...comments, newReply(to, body, author)]),
    setResolved: (id: string, resolved: boolean) =>
      save(comments.map((comment) => (comment.id === id ? { ...comment, resolved } : comment))),
  };
}
