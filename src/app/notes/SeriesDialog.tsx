import { useEffect, useState } from "react";
import { parentOf } from "../../project/libraryFolders.js";
import { listSeries, seriesTitle } from "../../project/series.js";
import { sceneIdsIn, sortsOf } from "../../project/tree.js";
import { platform } from "../platform.js";
import { Switch } from "../controls.js";
import type { Project } from "../useProject.js";
import { useEscape } from "../useShortcut.js";
import { DialogActions } from "./NewNoteDialog.js";
import { t } from "../../i18n/i18n.js";

interface SeriesDialogProps {
  book: Project;
  onJoin: (folder: string | null) => void;
  onCreate: (title: string, noteIds: string[]) => void;
  onClose: () => void;
}

// "" is no series, NEW a series still to be named, anything else a series folder.
const NEW = "+";

function useSeriesFolders(book: Project) {
  const [folders, setFolders] = useState<string[]>([]);
  useEffect(() => {
    void listSeries(platform.fileSystem, parentOf(book.dir)).then(setFolders);
  }, [book.dir]);
  return folders;
}

function SeriesChips(props: { folders: string[]; choice: string; onChoose: (c: string) => void }) {
  const options: [string, string][] = [
    ["", t("Ingen serie")],
    ...props.folders.map((folder): [string, string] => [folder, seriesTitle(folder)]),
    [NEW, t("+ Ny serie")],
  ];
  return (
    <div className="field">
      <span className="setting-hint">
        {t("Böckerna i en serie delar personer, platser och andra anteckningar.")}
      </span>
      <div className="note-sorts" role="radiogroup" aria-label={t("Serie")}>
        {options.map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={props.choice === value}
            className={value === NEW ? "chip dashed" : "chip"}
            onClick={() => props.onChoose(value)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

type NewSeriesProps = {
  name: string;
  onName: (name: string) => void;
  noteCount: number;
  isMoving: boolean;
  onFlip: () => void;
};

function MoveNotesRow(props: NewSeriesProps) {
  if (props.noteCount === 0) return null;
  return (
    <div className="note-link-row">
      <span className="setting-text">
        <span>{t("Flytta bokens anteckningar till serien")}</span>
        <span className="setting-hint">
          {t("{count} anteckningar. Då ser alla böcker i serien dem.", {
            count: props.noteCount,
          })}
        </span>
      </span>
      <Switch
        label={t("Flytta bokens anteckningar till serien")}
        isOn={props.isMoving}
        onFlip={props.onFlip}
      />
    </div>
  );
}

function NewSeriesFields(props: NewSeriesProps) {
  return (
    <>
      <label className="field">
        <span className="field-label">{t("Seriens namn")}</span>
        <input
          className="note-name"
          autoFocus
          value={props.name}
          onChange={(event) => props.onName(event.target.value)}
        />
      </label>
      <MoveNotesRow {...props} />
    </>
  );
}

function useSeriesForm(props: SeriesDialogProps) {
  const current = props.book.fields["series"];
  const [choice, setChoice] = useState(typeof current === "string" ? current : "");
  const [name, setName] = useState("");
  const [isMoving, setMoving] = useState(true);
  const noteIds = sortsOf(props.book.tree).flatMap((sort) => sceneIdsIn(props.book.tree, sort.id));
  const isReady = choice !== NEW || name.trim() !== "";
  const save = () => {
    if (choice === NEW) props.onCreate(name.trim(), isMoving ? noteIds : []);
    else props.onJoin(choice === "" ? null : choice);
    props.onClose();
  };
  return { choice, setChoice, name, setName, isMoving, setMoving, noteIds, isReady, save };
}

export function SeriesDialog(props: SeriesDialogProps) {
  const folders = useSeriesFolders(props.book);
  const form = useSeriesForm(props);
  useEscape(props.onClose);
  return (
    <div className="dialog-backdrop" onClick={props.onClose}>
      <form
        className="dialog note-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t("Serie")}
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => (event.preventDefault(), form.isReady && form.save())}
      >
        <SeriesChips folders={folders} choice={form.choice} onChoose={form.setChoice} />
        {form.choice === NEW && (
          <NewSeriesFields
            name={form.name}
            onName={form.setName}
            noteCount={form.noteIds.length}
            isMoving={form.isMoving}
            onFlip={() => form.setMoving(!form.isMoving)}
          />
        )}
        <DialogActions isReady={form.isReady} label={t("Spara")} onClose={props.onClose} />
      </form>
    </div>
  );
}
