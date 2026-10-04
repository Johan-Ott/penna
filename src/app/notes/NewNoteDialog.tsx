import { useState } from "react";
import { isLinkedByDefault } from "../../project/cards.js";
import { CHARACTERS_ID, sortsOf } from "../../project/tree.js";
import { nodeLabel } from "../../project/treeLabels.js";
import { Switch } from "../settings/controls.js";
import { useEscape } from "../useShortcut.js";
import type { Project } from "../useProject.js";
import type { NewNote } from "./useNoteActions.js";
import { t } from "../../i18n/i18n.js";

interface NewNoteDialogProps {
  project: Project;
  /** The sort chosen at the start, such as the one whose empty state asked for a note. */
  sortId: string | null;
  onCreate: (note: NewNote) => void;
  onClose: () => void;
}

type SortChipsProps = {
  project: Project;
  sortId: string | null;
  newSort: string | null;
  onPick: (sortId: string) => void;
  onNewSort: (title: string) => void;
};

// "+ Egen sort" turns into a field; a named sort is made together with the note.
function NewSortChip(props: SortChipsProps) {
  if (props.newSort === null) {
    return (
      <button type="button" className="chip dashed" onClick={() => props.onNewSort("")}>
        {t("+ Egen sort")}
      </button>
    );
  }
  return (
    <input
      className="chip-input"
      autoFocus
      aria-label={t("Namn på den nya sorten")}
      value={props.newSort}
      onChange={(event) => props.onNewSort(event.target.value)}
    />
  );
}

function SortChips(props: SortChipsProps) {
  const { tree, summaries } = props.project;
  return (
    <div className="note-sorts" role="radiogroup" aria-label={t("Sort")}>
      {sortsOf(tree).map((sort) => (
        <button
          key={sort.id}
          type="button"
          role="radio"
          aria-checked={props.newSort === null && sort.id === props.sortId}
          className="chip"
          onClick={() => props.onPick(sort.id)}
        >
          {nodeLabel(sort, tree, summaries)}
        </button>
      ))}
      <NewSortChip {...props} />
    </div>
  );
}

type Form = ReturnType<typeof useNoteForm>;

function LinkRow({ form }: { form: Form }) {
  const hint = form.isLinked
    ? t("”{name}” blir klickbart överallt i manuset.", { name: form.note.name || t("Namnet") })
    : t("Av för övriga anteckningar. Går att slå på.");
  return (
    <div className="note-link-row">
      <span className="setting-text">
        <span>{t("Koppla namnet i texten")}</span>
        <span className="setting-hint">{hint}</span>
      </span>
      <Switch label={t("Koppla namnet i texten")} isOn={form.isLinked} onFlip={form.flip} />
    </div>
  );
}

function NoteFields({ form, project }: { form: Form; project: Project }) {
  return (
    <>
      <label className="field">
        <span className="field-label">{t("Namn")}</span>
        <input
          className="note-name"
          autoFocus
          value={form.name}
          onChange={(event) => form.setName(event.target.value)}
        />
      </label>
      <div className="field">
        <span className="field-label">{t("Sort")}</span>
        <SortChips project={project} {...form} onPick={form.pick} onNewSort={form.setNewSort} />
      </div>
      <LinkRow form={form} />
    </>
  );
}

function useNoteForm(initialSort: string) {
  const [name, setName] = useState("");
  const [sortId, setSortId] = useState(initialSort);
  const [newSort, setNewSort] = useState<string | null>(null);
  const [linkChoice, setLinkChoice] = useState<boolean | null>(null);
  const isLinked = linkChoice ?? (newSort !== null || isLinkedByDefault(sortId));
  const note: NewNote = {
    name: name.trim(),
    sortId,
    newSortTitle: newSort?.trim() ? newSort.trim() : null,
    isLinked,
  };
  const isReady = note.name !== "" && (newSort === null || note.newSortTitle !== null);
  const pick = (id: string) => (setSortId(id), setNewSort(null));
  const flip = () => setLinkChoice(!isLinked);
  return { name, setName, sortId, pick, newSort, setNewSort, isLinked, flip, note, isReady };
}

/** Ny anteckning: a name, a sort, and whether the name is linked wherever it is written. */
export function NewNoteDialog(props: NewNoteDialogProps) {
  const form = useNoteForm(props.sortId ?? CHARACTERS_ID);
  useEscape(props.onClose);
  const create = () => form.isReady && (props.onCreate(form.note), props.onClose());
  return (
    <div className="dialog-backdrop" onClick={props.onClose}>
      <form
        className="dialog note-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t("Ny anteckning")}
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => (event.preventDefault(), create())}
      >
        <NoteFields form={form} project={props.project} />
        <div className="dialog-actions">
          <button type="button" className="button ghost" onClick={props.onClose}>
            {t("Avbryt")}
          </button>
          <button type="submit" className="button primary" disabled={!form.isReady}>
            {t("Skapa")}
          </button>
        </div>
      </form>
    </div>
  );
}
