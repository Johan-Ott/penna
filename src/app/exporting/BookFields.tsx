import { useState } from "react";
import { bookDetails } from "../../export/book.js";
import type { Project } from "../useProject.js";
import { COVER_MINIMUM, isCoverTooSmall } from "../../project/cover.js";
import type { useCover } from "./useCover.js";
import { EXTRA_FIELDS } from "./bookMaterial.js";
import type { ExportChoices } from "./useExport.js";
import { t } from "../../i18n/i18n.js";

type PartKey = Exclude<keyof ExportChoices, "format" | "typography">;

// A standard manuscript has only a title page; a printed or e-book has the other parts too.
const PARTS: [PartKey, string, boolean][] = [
  ["hasTitlePage", t("Titelsida"), true],
  ["hasCopyrightPage", t("Upphovsrättssida"), false],
  ["hasDedication", t("Dedikation"), false],
  ["hasContents", t("Innehållsförteckning"), false],
  ["hasThanks", t("Tack"), false],
  ["hasAbout", t("Om författaren"), false],
];

const PLACEHOLDERS: Record<keyof typeof EXTRA_FIELDS, string> = {
  hasDedication: "Till …",
  hasThanks: t("Tack till …"),
  hasAbout: t("Några rader om dig. En tom rad börjar ett nytt stycke."),
};

const isExtra = (key: PartKey): key is keyof typeof EXTRA_FIELDS => key in EXTRA_FIELDS;

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

// Saves when the field is left, not on every key.
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
    ["author", t("Författarnamn"), generalAuthor || t("Namn eller pseudonym")],
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
    return t("Bilden är {width} × {height} px. E-bokhandlare vill ha minst {minimum}.", {
      ...picture.size,
      minimum,
    });
  }
  return picture ? t("Din bild används som omslag.") : `JPG eller PNG, minst ${minimum}.`;
}

function CoverRow({ cover }: Pick<BookFieldsProps, "cover">) {
  return (
    <div className="cover-row">
      <div className="cover-thumb">
        {cover.url ? <img src={cover.url} alt="" /> : <span>{t("Text")}</span>}
      </div>
      <div className="cover-text">
        <span>{t("Omslag")}</span>
        <span className="setting-hint">{coverHint(cover)}</span>
        <button className="button secondary small" onClick={cover.choose}>
          {t("Byt bild…")}
        </button>
      </div>
    </div>
  );
}

export function BookFields(props: BookFieldsProps) {
  return (
    <div className="export-column">
      <span className="export-heading">{t("Bokuppgifter")}</span>
      <Details {...props} />
      {props.choices.format === "ebok" && <CoverRow cover={props.cover} />}
      <span className="export-heading spaced">{t("Bokens delar")}</span>
      <Parts {...props} />
    </div>
  );
}
