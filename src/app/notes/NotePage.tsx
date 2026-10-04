import { chapterRuns } from "../../project/cards.js";
import { CHARACTERS_ID, findNode, NOTES_ID, PLACES_ID, THINGS_ID } from "../../project/tree.js";
import { chapterOf } from "../../project/treeLabels.js";
import type { Project } from "../useProject.js";
import { mentionedChapters } from "./cardFormat.js";
import type { Notes } from "./useNotes.js";
import { Connections } from "./Connections.js";
import { t } from "../../i18n/i18n.js";

export interface NotePageProps {
  /** Where the note lives: the series, or the book itself. */
  project: Project;
  /** The open book, whose chapters the note is named in. */
  book: Project;
  noteId: string;
  notes: Notes;
  onOpen: (id: string) => void;
  onSaveFields: (fields: Record<string, unknown>) => void;
}

// "PERSON" above the name: the fixed sorts in the singular, the writer's own by their name.
function kindLabel(project: Project, sortId: string) {
  const fixed: Record<string, string> = {
    [CHARACTERS_ID]: t("Person"),
    [PLACES_ID]: t("Plats"),
    [THINGS_ID]: t("Sak"),
    [NOTES_ID]: t("Övrigt"),
  };
  return fixed[sortId] ?? findNode(project.tree, sortId)?.node.title ?? "";
}

/** The sort a note lies in, or null when the open text is not a note. */
export function noteSortOf(project: Project, id: string) {
  const parent = findNode(project.tree, id)?.parent;
  return parent?.kind === "sort" ? parent.id : null;
}

/** Above a note: its sort, where it is named, its name and its connections. */
export function NoteHeader(props: NotePageProps & { sortId: string }) {
  const { project, noteId } = props;
  const chapters = mentionedChapters(props.book, props.notes.mentions.get(noteId));
  return (
    <header className="note-header">
      <div className="text-eyebrow">
        <span>{kindLabel(project, props.sortId)}</span>
        {chapters.length > 0 && (
          <span className="eyebrow-end">
            {t("Nämns i kap. {chapters}", { chapters: chapterRuns(chapters) })}
          </span>
        )}
      </div>
      <h1>{project.summaries[noteId]?.title ?? ""}</h1>
      <Connections {...props} />
    </header>
  );
}

/** Below a note: every scene that names it, with the sentence, in reading order. */
export function NoteMentions({ book: project, noteId, notes, onOpen }: NotePageProps) {
  const mentions = notes.mentions.get(noteId);
  if (!mentions || mentions.sceneIds.length === 0) return null;
  const placeOf = (id: string) => {
    const chapter = chapterOf(project.tree, id);
    return chapter ? `${chapter.number}. ${chapter.title}` : (project.summaries[id]?.title ?? "");
  };
  return (
    <section className="note-mentions" aria-label={t("Nämns i")}>
      <span className="note-mentions-heading">{t("Nämns i")}</span>
      {mentions.sceneIds.map((id) => (
        <button key={id} className="note-mention" onClick={() => onOpen(id)}>
          <span className="note-mention-place">{placeOf(id)}</span>
          <span className="note-mention-text">{mentions.sentences[id]}</span>
        </button>
      ))}
    </section>
  );
}
