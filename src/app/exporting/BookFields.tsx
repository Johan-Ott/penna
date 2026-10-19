import { useState } from "react";
import { Parts } from "./PartFields.js";
import { bookDetails } from "../../export/book.js";
import type { Project } from "../useProject.js";
import { COVER_MINIMUM, isCoverTooSmall } from "../../project/cover.js";
import type { useCover } from "./useCover.js";
import type { ExportChoices } from "./useExport.js";
import { t } from "../../i18n/i18n.js";

export interface BookFieldsProps {
  cover: ReturnType<typeof useCover>;
  project: Project;
  generalAuthor: string;
  choices: ExportChoices;
  setChoices: (choices: ExportChoices) => void;
  onSaveFields: (fields: Record<string, unknown>) => void;
}

// Empty is fine, as the ISBN is optional; the hyphens are only for reading.
const isIsbn = (value: string) => {
  const digits = value.replace(/[\s-]/g, "");
  return digits === "" || /^(\d{9}[\dX]|\d{13})$/i.test(digits);
};

// Saves when the field is left, not on every key.
function DetailField(props: {
  label: string;
  value: string;
  placeholder: string;
  isIsbn?: boolean;
  onSave: (value: string) => void;
}) {
  const [value, setValue] = useState(props.value);
  const isWrong = props.isIsbn === true && !isIsbn(value);
  return (
    <label className="export-field">
      <span className="setting-hint">{props.label}</span>
      <input
        className="settings-text"
        aria-invalid={isWrong}
        value={value}
        placeholder={props.placeholder}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => value !== props.value && props.onSave(value)}
      />
      {isWrong && (
        <span className="setting-hint">{t("Ett ISBN har 10 eller 13 siffror, som 978-91-…")}</span>
      )}
    </label>
  );
}

function Details({ project, generalAuthor, choices, onSaveFields }: BookFieldsProps) {
  const details: [string, string, string][] = [
    ["author", t("Författarnamn"), generalAuthor || t("Namn eller pseudonym")],
    ["subtitle", t("Undertitel (valfritt)"), bookDetails(project.fields, "", 0).subtitle],
    ...(choices.format !== "manus"
      ? [["isbn", t("ISBN (valfritt)"), "978-91-…"] as [string, string, string]]
      : []),
  ];
  return details.map(([key, label, placeholder]) => (
    <DetailField
      key={key}
      label={label}
      value={String(project.fields[key] ?? "")}
      placeholder={placeholder}
      isIsbn={key === "isbn"}
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
        {cover.url ? <img src={cover.url} alt="" /> : <span>{t("Textomslag")}</span>}
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
      <Details {...props} />
      {props.choices.format === "ebok" && <CoverRow cover={props.cover} />}
      <span className="export-heading spaced">{t("Bokens delar")}</span>
      <Parts {...props} />
    </div>
  );
}
