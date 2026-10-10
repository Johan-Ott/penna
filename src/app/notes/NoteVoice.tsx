import { linesOf } from "../../manuscript/voice.js";
import { manuscriptSceneIds } from "../../project/tree.js";
import { chapterOf } from "../../project/treeLabels.js";
import type { NotePageProps } from "./NotePage.js";
import { t } from "../../i18n/i18n.js";

const MOST_LINES = 100;

/** On a person's page: everything they say in the book, in order, to hear whether the voice holds. */
export function NoteVoice({ project, book, noteId, notes, onOpen }: NotePageProps) {
  const name = project.summaries[noteId]?.title ?? "";
  const scenes = manuscriptSceneIds(book.tree).map((sceneId) => ({
    sceneId,
    text: notes.manuscript[sceneId] ?? "",
  }));
  const lines = linesOf(name, scenes).slice(0, MOST_LINES);
  if (lines.length === 0) return null;
  const chapterNumber = (id: string) => chapterOf(book.tree, id)?.number;
  return (
    <section className="note-mentions note-voice" aria-label={t("Repliker")}>
      <span className="note-mentions-heading">
        {t("Repliker · {count}", { count: lines.length })}
      </span>
      {lines.map(({ sceneId, line }, index) => (
        <button key={`${sceneId}${index}`} className="note-mention" onClick={() => onOpen(sceneId)}>
          <span className="note-mention-place">
            {chapterNumber(sceneId)
              ? t("Kap. {number}", { number: chapterNumber(sceneId) ?? "" })
              : ""}
          </span>
          <span className="note-mention-text">{line}</span>
        </button>
      ))}
    </section>
  );
}
