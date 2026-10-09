import { useLayoutEffect, useRef } from "react";
import type { Comment } from "../../project/comments.js";
import { snapshotWhen } from "../../project/snapshots.js";
import type { AppState } from "../App.js";
import { t } from "../../i18n/i18n.js";

const GAP = 16;
const NARROWEST = 160;

// Each note sits level with its quote, pushed down below the note above so none overlap.
// On paper the notes lie on the desk beside the sheet, otherwise beside the text.
function placeNotes(box: HTMLElement) {
  const page = box.parentElement;
  const beside = page?.querySelector(page.classList.contains("paper") ? ".sheet" : ".ProseMirror");
  if (!page || !beside) return;
  const origin = page.getBoundingClientRect();
  const left = beside.getBoundingClientRect().right - origin.left + 32;
  box.hidden = page.clientWidth - left < NARROWEST;
  box.style.left = `${left}px`;
  const markTop = (note: HTMLElement) =>
    page
      .querySelector(`.commented[data-comment="${note.dataset["comment"]}"]`)
      ?.getBoundingClientRect().top ?? null;
  const notes = Array.from(box.querySelectorAll<HTMLElement>(".margin-note"));
  let below = 0;
  notes
    .map((note) => ({ note, top: markTop(note) }))
    .sort((one, two) => (one.top ?? 0) - (two.top ?? 0))
    .forEach(({ note, top }) => {
      note.hidden = top === null;
      if (top === null) return;
      const noteTop = Math.max(top - origin.top + page.scrollTop, below);
      note.style.top = `${noteTop}px`;
      below = noteTop + note.offsetHeight + GAP;
    });
}

function usePlacement(shown: unknown, doc: unknown) {
  const box = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = box.current;
    const page = element?.parentElement;
    if (!element || !page) return;
    const place = () => placeNotes(element);
    place();
    const observer = new ResizeObserver(place);
    observer.observe(page);
    return () => observer.disconnect();
  }, [shown, doc]);
  return box;
}

function Note({ app, comment, replies }: { app: AppState; comment: Comment; replies: number }) {
  const reply = () => {
    app.comments.focus(comment.id);
    app.writingMode.setReviewOpen(true);
  };
  return (
    <div className="margin-note" data-comment={comment.id}>
      <span className="margin-note-body">{comment.body}</span>
      <span className="margin-note-by">
        {comment.author} · {snapshotWhen(comment.createdAt, Date.now()).toLowerCase()}
        {replies > 0 && ` · ${t("{count} svar", { count: replies })}`}
        <button className="link-button" onClick={() => app.comments.setResolved(comment.id, true)}>
          {t("Klar")}
        </button>
        <button className="link-button" onClick={reply}>
          {t("Svara")}
        </button>
      </span>
    </div>
  );
}

/** Kommentarer i marginalen: the open comments beside the text, level with what they are about. */
export function MarginNotes({ app }: { app: AppState }) {
  const all = app.comments.comments;
  const shown = all.filter((comment) => !comment.replyTo && !comment.resolved);
  const box = usePlacement(shown, app.editor.editorState?.doc);
  const { settings, isFocusMode } = app.writingMode;
  if (!settings.commentsInMargin || isFocusMode || shown.length === 0) return null;
  return (
    <div className="margin-notes" ref={box}>
      {shown.map((comment) => (
        <Note
          key={comment.id}
          app={app}
          comment={comment}
          replies={all.filter((reply) => reply.replyTo === comment.id).length}
        />
      ))}
    </div>
  );
}
