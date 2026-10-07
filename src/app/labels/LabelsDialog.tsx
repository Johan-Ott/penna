import { useState } from "react";
import {
  LABEL_COLORS,
  hasLabel,
  labelsOf,
  withLabel,
  withoutLabel,
  type Label,
} from "../../project/labels.js";
import type { TreeNode } from "../../project/tree.js";
import { newSceneId } from "../../storage/sceneId.js";
import { Dialog } from "../controls.js";
import { StatusStepsEditor } from "./StatusStepsEditor.js";
import type { Project } from "../useProject.js";
import { t } from "../../i18n/i18n.js";

export type ProjectChange = { tree?: TreeNode[]; fields?: Record<string, unknown> };

interface LabelsDialogProps {
  project: Project;
  /** The row it was opened from: its labels are ticked here. */
  nodeId: string;
  onUpdate: (change: ProjectChange) => void;
  onClose: () => void;
}

const nextColor = (color: string) =>
  LABEL_COLORS[(LABEL_COLORS.indexOf(color) + 1) % LABEL_COLORS.length] ?? color;

type RowProps = LabelsDialogProps & { label: Label; labels: Label[] };

function labelChanges({ project, label, labels, onUpdate }: RowProps) {
  return {
    save: (changed: Partial<Label>) =>
      onUpdate({
        fields: {
          labels: labels.map((each) => (each.id === label.id ? { ...each, ...changed } : each)),
        },
      }),
    remove: () =>
      onUpdate({
        tree: withoutLabel(project.tree, label.id),
        fields: { labels: labels.filter((each) => each.id !== label.id) },
      }),
  };
}

function LabelRow(props: RowProps) {
  const { project, nodeId, label, onUpdate } = props;
  const { save, remove } = labelChanges(props);
  const [isOn, name] = [hasLabel(project.tree, nodeId, label.id), label.name];
  return (
    <li className="label-row">
      <input
        type="checkbox"
        aria-label={t("Sätt {name} på raden", { name })}
        checked={isOn}
        onChange={() => onUpdate({ tree: withLabel(project.tree, nodeId, label.id, !isOn) })}
      />
      <button
        className="label-color"
        aria-label={t("Byt färg på {name}", { name })}
        style={{ background: label.color }}
        onClick={() => save({ color: nextColor(label.color) })}
      />
      <input
        className="label-name"
        aria-label={t("Namn")}
        defaultValue={name}
        onBlur={(event) => event.target.value.trim() && save({ name: event.target.value.trim() })}
      />
      <button className="icon-button" aria-label={t("Ta bort {name}", { name })} onClick={remove}>
        ×
      </button>
    </li>
  );
}

function NewLabel(props: LabelsDialogProps & { labels: Label[] }) {
  const [name, setName] = useState("");
  const add = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const color = LABEL_COLORS[props.labels.length % LABEL_COLORS.length] ?? "#7d7d7d";
    const label = { id: newSceneId(), name: trimmed, color };
    props.onUpdate({
      fields: { labels: [...props.labels, label] },
      tree: withLabel(props.project.tree, props.nodeId, label.id, true),
    });
    setName("");
  };
  return (
    <form className="label-new" onSubmit={(event) => (event.preventDefault(), add())}>
      <input
        aria-label={t("Ny label")}
        placeholder={t("Ny label, till exempel Elin eller Skriv om")}
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <button type="submit" className="button secondary small" disabled={!name.trim()}>
        {t("Lägg till")}
      </button>
    </form>
  );
}

/** Ticks the row's labels, and keeps the book's labels: their names, colours and new ones. */
export function LabelsDialog(props: LabelsDialogProps) {
  const labels = labelsOf(props.project.fields);
  return (
    <Dialog label={t("Status och labels")} className="labels-dialog" onClose={props.onClose}>
      <span className="field-label">{t("Status")}</span>
      <StatusStepsEditor project={props.project} onUpdate={props.onUpdate} />
      <span className="field-label labels-heading">{t("Labels")}</span>
      {labels.length === 0 && <p className="dialog-text">{t("Boken har inga labels än.")}</p>}
      <ul className="label-list">
        {labels.map((label) => (
          <LabelRow key={label.id} {...props} label={label} labels={labels} />
        ))}
      </ul>
      <NewLabel {...props} labels={labels} />
    </Dialog>
  );
}
