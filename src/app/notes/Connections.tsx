import { useState } from "react";
import {
  connectionsOf,
  withConnection,
  withoutConnection,
  type Connection,
} from "../../project/connections.js";
import { sceneIdsIn, sortsOf } from "../../project/tree.js";
import type { Project } from "../useProject.js";
import type { NotePageProps } from "./NotePage.js";
import { t } from "../../i18n/i18n.js";
import { Dropdown } from "../controls.js";

const otherNotes = (project: Project, noteId: string) =>
  sortsOf(project.tree)
    .flatMap((sort) => sceneIdsIn(project.tree, sort.id))
    .filter((id) => id !== noteId && project.summaries[id]);

function NoteSelect(props: {
  project: Project;
  ids: string[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <Dropdown
      label={t("Anteckning")}
      value={props.value}
      options={props.ids.map((id) => [id, props.project.summaries[id]?.title ?? ""])}
      onSelect={props.onChange}
    />
  );
}

function AddConnection(props: {
  project: Project;
  noteId: string;
  onAdd: (connection: Connection) => void;
  onCancel: () => void;
}) {
  const others = otherNotes(props.project, props.noteId);
  const [otherId, setOtherId] = useState(others[0] ?? "");
  const [role, setRole] = useState("");
  const add = () => otherId && props.onAdd({ id: otherId, role });
  return (
    <form className="connection-form" onSubmit={(event) => (event.preventDefault(), add())}>
      <NoteSelect project={props.project} ids={others} value={otherId} onChange={setOtherId} />
      <input
        aria-label={t("Vad de är för varandra")}
        placeholder={t("brorsdotter")}
        value={role}
        onChange={(event) => setRole(event.target.value)}
      />
      <button type="submit" className="button primary small" disabled={!otherId}>
        {t("Lägg till")}
      </button>
      <button type="button" className="button ghost small" onClick={props.onCancel}>
        {t("Avbryt")}
      </button>
    </form>
  );
}

function ConnectionChip(props: NotePageProps & { connection: Connection }) {
  const { project, noteId, connection } = props;
  return (
    <span className="connection">
      <button className="connection-name" onClick={() => props.onOpen(connection.id)}>
        {project.summaries[connection.id]?.title ?? t("Hittas inte")}
        {connection.role && <span className="connection-role">, {connection.role}</span>}
      </button>
      <button
        className="connection-remove"
        aria-label={t("Ta bort kopplingen")}
        onClick={() => props.onSaveFields(withoutConnection(project.fields, noteId, connection.id))}
      >
        ×
      </button>
    </span>
  );
}

export function Connections(props: NotePageProps) {
  const { project, noteId } = props;
  const [isAdding, setAdding] = useState(false);
  const add = (connection: Connection) => {
    props.onSaveFields(withConnection(project.fields, noteId, connection));
    setAdding(false);
  };
  return (
    <div className="connections">
      {connectionsOf(project.fields, noteId).map((connection) => (
        <ConnectionChip key={connection.id} {...props} connection={connection} />
      ))}
      {isAdding ? (
        <AddConnection {...props} onAdd={add} onCancel={() => setAdding(false)} />
      ) : (
        <button className="connection-add" onClick={() => setAdding(true)}>
          {t("+ Koppling")}
        </button>
      )}
    </div>
  );
}
