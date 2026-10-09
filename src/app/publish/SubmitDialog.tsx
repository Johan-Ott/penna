import { useState } from "react";
import { bookLanguage } from "../../project/bookLanguage.js";
import { dayKey } from "../../project/stats.js";
import {
  submissionsOf,
  withSubmission,
  type Submission,
  type SubmissionStatus,
} from "../../project/submissions.js";
import { newSceneId } from "../../storage/sceneId.js";
import { Dialog } from "../controls.js";
import { recordFailure } from "../errorLog.js";
import { platform } from "../platform.js";
import type { Project } from "../useProject.js";
import { t } from "../../i18n/i18n.js";

type Tab = "synopsis" | "brev" | "inskick";
type SaveFields = (fields: Record<string, unknown>) => void;

const WORD = { name: "Word-dokument", extension: "docx" };

// The text in the book's fields, saved as Word in the manuscript's typeface.
async function saveAsWord(project: Project, author: string, tab: "synopsis" | "brev") {
  const { letterDocx } = await import("../../export/letterDocx.js");
  const text = String(project.fields[tab === "synopsis" ? "synopsis" : "queryLetter"] ?? "");
  const heading = tab === "synopsis" ? t("Synopsis · {book}", { book: project.name }) : "";
  const bytes = await letterDocx({ heading, text, author, language: bookLanguage(project.fields) });
  const name =
    tab === "synopsis"
      ? t("{book} synopsis", { book: project.name })
      : t("{book} följebrev", { book: project.name });
  await platform.saveFile(`${name}.docx`, bytes, WORD);
}

function TextTab(props: {
  project: Project;
  author: string;
  tab: "synopsis" | "brev";
  onSaveFields: SaveFields;
}) {
  const field = props.tab === "synopsis" ? "synopsis" : "queryLetter";
  const saved = String(props.project.fields[field] ?? "");
  const [value, setValue] = useState(saved);
  const hint =
    props.tab === "synopsis"
      ? t("Hela handlingen på en sida, slutet med. Förlagen vill veta hur det går.")
      : t("Kort: vad boken är, vem du är och varför just det här förlaget.");
  return (
    <>
      <span className="setting-hint">{hint}</span>
      <textarea
        key={props.tab}
        className="settings-text submit-text"
        aria-label={props.tab === "synopsis" ? t("Synopsis") : t("Följebrev")}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => value !== saved && props.onSaveFields({ [field]: value || undefined })}
      />
      <WordButton {...props} />
    </>
  );
}

const WordButton = (props: { project: Project; author: string; tab: "synopsis" | "brev" }) => (
  <button
    className="button secondary small"
    onClick={() =>
      void saveAsWord(props.project, props.author, props.tab).catch(recordFailure("Word"))
    }
  >
    {t("Spara som Word")}
  </button>
);

const STATUS_LABELS: [SubmissionStatus, string][] = [
  ["skickat", t("Skickat")],
  ["mer", t("Vill läsa mer")],
  ["nej", t("Nej tack")],
  ["ja", t("Ja!")],
];

const StatusSelect = (props: {
  status: SubmissionStatus;
  onChange: (status: SubmissionStatus) => void;
}) => (
  <select
    aria-label={t("Svar")}
    value={props.status}
    onChange={(event) => props.onChange(event.target.value as SubmissionStatus)}
  >
    {STATUS_LABELS.map(([status, label]) => (
      <option key={status} value={status}>
        {label}
      </option>
    ))}
  </select>
);

function SubmissionRow(props: {
  row: Submission;
  onChange: (change: Partial<Submission> | null) => void;
}) {
  const { row, onChange } = props;
  return (
    <li className={`submit-row ${row.status}`}>
      <input
        aria-label={t("Förlag eller agent")}
        defaultValue={row.to}
        placeholder={t("Förlag eller agent")}
        onBlur={(event) => onChange({ to: event.target.value })}
      />
      <input
        type="date"
        aria-label={t("Skickat den")}
        value={row.sent}
        onChange={(event) => onChange({ sent: event.target.value })}
      />
      <StatusSelect status={row.status} onChange={(status) => onChange({ status })} />
      <button
        className="icon-button"
        aria-label={t("Ta bort {to}", { to: row.to })}
        onClick={() => onChange(null)}
      >
        ×
      </button>
    </li>
  );
}

/** Where the manuscript has gone and what came back; a "Ja!" is worth waiting for. */
function SubmissionsTab({ project, onSaveFields }: { project: Project; onSaveFields: SaveFields }) {
  const [rows, setRows] = useState(() => submissionsOf(project.fields));
  const save = (next: Submission[]) => (setRows(next), onSaveFields({ submissions: next }));
  const change = (id: string) => (change: Partial<Submission> | null) =>
    save(change ? withSubmission(rows, id, change) : rows.filter((row) => row.id !== id));
  const add = () =>
    save([
      ...rows,
      { id: newSceneId(), to: "", sent: dayKey(Date.now()), status: "skickat", note: "" },
    ]);
  return (
    <>
      {rows.length === 0 && <span className="setting-hint">{t("Inga inskick än.")}</span>}
      <ul className="submit-list">
        {rows.map((row) => (
          <SubmissionRow key={row.id} row={row} onChange={change(row.id)} />
        ))}
      </ul>
      <button className="button secondary small" onClick={add}>
        {t("Lägg till inskick")}
      </button>
    </>
  );
}

/** Till förlag: the synopsis, the cover letter and the list of where the manuscript has been sent. */
export function SubmitDialog(props: {
  project: Project;
  author: string;
  onSaveFields: SaveFields;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("synopsis");
  const tabs: [Tab, string][] = [
    ["synopsis", t("Synopsis")],
    ["brev", t("Följebrev")],
    ["inskick", t("Inskick")],
  ];
  return (
    <Dialog label={t("Till förlag")} className="submit-dialog" onClose={props.onClose}>
      <div className="segmented small" role="radiogroup" aria-label={t("Visa")}>
        {tabs.map(([id, label]) => (
          <button key={id} role="radio" aria-checked={tab === id} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === "inskick" ? (
        <SubmissionsTab {...props} />
      ) : (
        <TextTab key={tab} {...props} tab={tab} />
      )}
    </Dialog>
  );
}

/** In Publicera beside Studio: what goes to publishers and agents, apart from the manuscript. */
export function SubmitLink(props: {
  project: Project;
  generalAuthor: string;
  onSaveFields: SaveFields;
}) {
  const [isOpen, setOpen] = useState(false);
  const author = String(props.project.fields["author"] ?? "") || props.generalAuthor;
  return (
    <>
      <button className="studio-link" onClick={() => setOpen(true)}>
        <span className="studio-item-name">{t("Till förlag")}</span>
        <span className="insight-muted">{t("Synopsis, följebrev och vart du har skickat")}</span>
      </button>
      {isOpen && <SubmitDialog {...props} author={author} onClose={() => setOpen(false)} />}
    </>
  );
}
