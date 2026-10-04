import { useState } from "react";
import { bookDetails } from "../../export/book.js";
import type { Project } from "../useProject.js";
import { COVER_MINIMUM, isCoverTooSmall } from "../../project/cover.js";
import type { useCover } from "./useCover.js";
import { EXTRA_FIELDS } from "./bookMaterial.js";
import type { ExportChoices } from "./useExport.js";

type PartKey = Exclude<keyof ExportChoices, "format" | "typography">;

// A standard manuscript has only a title page; a book, printed or e-book, has the rest too.
const PARTS: [PartKey, string, boolean][] = [
  ["hasTitlePage", "Titelsida", true],
  ["hasCopyrightPage", "Upphovsrättssida", false],
  ["hasDedication", "Dedikation", false],
  ["hasContents", "Innehållsförteckning", false],
  ["hasThanks", "Tack", false],
  ["hasAbout", "Om författaren", false],
];

const PLACEHOLDERS: Record<keyof typeof EXTRA_FIELDS, string> = {
  hasDedication: "Till …",
  hasThanks: "Tack till …",
  hasAbout: "Några rader om dig. En tom rad börjar ett nytt stycke.",
};

const isExtra = (key: PartKey): key is keyof typeof EXTRA_FIELDS => key in EXTRA_FIELDS;

// The part's own text, kept in project.json and saved when the box is left.
function PartText(
  props: { field: string; placeholder: string } & Pick<BookFieldsProps, "project" | "onSaveFields">,
) {
  const saved = String(props.project.fields[props.field] ?? "");
  const [value, setValue] = useState(saved);
  return (
    <textarea
      className="settings-text part-text"
      rows={3}
      aria-label={props.placeholder}
      value={value}
      placeholder={props.placeholder}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() =>
        value !== saved && props.onSaveFields({ [props.field]: value.trim() || undefined })
      }
    />
  );
}

interface BookFieldsProps {
  cover: ReturnType<typeof useCover>;
  project: Project;
  generalAuthor: string;
  choices: ExportChoices;
  setChoices: (choices: ExportChoices) => void;
  onSaveFields: (fields: Record<string, unknown>) => void;
}

// Saved when the field is left, so typing does not write project.json on every key.
function DetailField(props: {
  label: string;
  value: string;
  placeholder: string;
  onSave: (value: string) => void;
}) {
  const [value, setValue] = useState(props.value);
  return (
    <label className="export-field">
      <span className="setting-hint">{props.label}</span>
      <input
        className="settings-text"
        value={value}
        placeholder={props.placeholder}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => value !== props.value && props.onSave(value)}
      />
    </label>
  );
}

function Parts(props: BookFieldsProps) {
  const { choices, setChoices } = props;
  const shown = PARTS.filter(
    ([, , isInManuscript]) => choices.format !== "manus" || isInManuscript,
  );
  return shown.map(([key, label]) => (
    <div key={key} className="export-part">
      <label className="export-check">
        <input
          type="checkbox"
          checked={choices[key]}
          onChange={(event) => setChoices({ ...choices, [key]: event.target.checked })}
        />
        {label}
      </label>
      {isExtra(key) && choices[key] && (
        <PartText {...props} field={EXTRA_FIELDS[key]} placeholder={PLACEHOLDERS[key]} />
      )}
    </div>
  ));
}

function Details({ project, generalAuthor, choices, onSaveFields }: BookFieldsProps) {
  const details: [string, string, string][] = [
    ["author", "Författarnamn", generalAuthor || "Namn eller pseudonym"],
    ["subtitle", "Undertitel (valfritt)", bookDetails(project.fields, "", 0).subtitle],
    ...(choices.format !== "manus"
      ? [["isbn", "ISBN (valfritt)", "978-91-…"] as [string, string, string]]
      : []),
  ];
  return details.map(([key, label, placeholder]) => (
    <DetailField
      key={key}
      label={label}
      value={String(project.fields[key] ?? "")}
      placeholder={placeholder}
      onSave={(value) => onSaveFields({ [key]: value.trim() || undefined })}
    />
  ));
}

function coverHint({ picture, problem }: BookFieldsProps["cover"]) {
  const minimum = `${COVER_MINIMUM.width} × ${COVER_MINIMUM.height} px`;
  if (problem) return problem;
  if (picture && isCoverTooSmall(picture.size)) {
    return `Bilden är ${picture.size.width} × ${picture.size.height} px. E-bokhandlare vill ha minst ${minimum}.`;
  }
  return picture ? "Din bild används som omslag." : `JPG eller PNG, minst ${minimum}.`;
}

// Without a picture of their own the book gets the typographic cover shown in the preview.
function CoverRow({ cover }: Pick<BookFieldsProps, "cover">) {
  return (
    <div className="cover-row">
      <div className="cover-thumb">
        {cover.url ? <img src={cover.url} alt="" /> : <span>Text</span>}
      </div>
      <div className="cover-text">
        <span>Omslag</span>
        <span className="setting-hint">{coverHint(cover)}</span>
        <button className="button secondary small" onClick={cover.choose}>
          Byt bild…
        </button>
      </div>
    </div>
  );
}

/** Bokuppgifter and bokens delar. The details are the book's, so they are kept in project.json. */
export function BookFields(props: BookFieldsProps) {
  return (
    <div className="export-column">
      <span className="export-heading">Bokuppgifter</span>
      <Details {...props} />
      {props.choices.format === "ebok" && <CoverRow cover={props.cover} />}
      <span className="export-heading spaced">Bokens delar</span>
      <Parts {...props} />
    </div>
  );
}
