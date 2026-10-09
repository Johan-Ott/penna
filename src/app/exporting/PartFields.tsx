import { useState } from "react";
import { knownBooks } from "../shelf/useShelf.js";
import type { BookFieldsProps } from "./BookFields.js";
import { EXTRA_FIELDS } from "./bookMaterial.js";
import type { ExportChoices } from "./useExport.js";
import { t } from "../../i18n/i18n.js";

type PartKey = Exclude<keyof ExportChoices, "format" | "typography">;
type Props = Pick<BookFieldsProps, "project" | "choices" | "setChoices" | "onSaveFields">;

// A standard manuscript has only a title page; store links can only be clicked in an e-book.
const PARTS: [PartKey, string][] = [
  ["hasTitlePage", t("Titelsida")],
  ["hasCopyrightPage", t("Upphovsrättssida")],
  ["hasDedication", t("Dedikation")],
  ["hasContents", t("Innehållsförteckning")],
  ["hasThanks", t("Tack")],
  ["hasAbout", t("Om författaren")],
  ["hasAlsoBy", t("Av samma författare")],
  ["hasNewsletter", t("Håll kontakten")],
  ["hasStores", t("Var du hittar mina böcker")],
  ["hasExcerpt", t("Utdrag ur en annan bok")],
];

const isShown = (key: PartKey, format: ExportChoices["format"]) =>
  format === "manus" ? key === "hasTitlePage" : key !== "hasStores" || format === "ebok";

const PLACEHOLDERS: Record<keyof typeof EXTRA_FIELDS, string> = {
  hasDedication: "Till …",
  hasThanks: t("Tack till …"),
  hasAbout: t("Några rader om dig. En tom rad börjar ett nytt stycke."),
  hasAlsoBy: t("En titel per rad"),
  hasNewsletter: t("Vill du veta när nästa bok kommer? Skriv upp dig på https://…"),
  hasStores: t("En butik per rad: Adlibris https://…"),
};

const isExtra = (key: PartKey): key is keyof typeof EXTRA_FIELDS => key in EXTRA_FIELDS;

// The other books on the shelf, the one being exported left out.
const otherBooks = (dir: string) =>
  knownBooks().filter((book) => book.dir !== dir && !book.isMissing);

function PartText(props: Props & { part: keyof typeof EXTRA_FIELDS }) {
  const field = EXTRA_FIELDS[props.part];
  const saved = String(props.project.fields[field] ?? "");
  const [value, setValue] = useState(saved);
  const save = (text: string) =>
    text !== saved && props.onSaveFields({ [field]: text.trim() || undefined });
  const titles = otherBooks(props.project.dir)
    .map((book) => book.title)
    .join("\n");
  return (
    <>
      <textarea
        className="settings-text part-text"
        rows={3}
        aria-label={PLACEHOLDERS[props.part]}
        value={value}
        placeholder={PLACEHOLDERS[props.part]}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => save(value)}
      />
      {props.part === "hasAlsoBy" && !value && titles && (
        <button className="link-button quiet" onClick={() => (setValue(titles), save(titles))}>
          {t("Fyll i från bokhyllan")}
        </button>
      )}
    </>
  );
}

/** Its first chapter closes this book, read from the other book when this one is exported. */
function ExcerptBook({ project, onSaveFields }: Props) {
  const books = otherBooks(project.dir);
  if (books.length === 0)
    return <span className="setting-hint">{t("Inga andra böcker på hyllan.")}</span>;
  return (
    <select
      className="settings-text"
      aria-label={t("Bok att ta utdraget ur")}
      value={String(project.fields["excerptBook"] ?? "")}
      onChange={(event) => onSaveFields({ excerptBook: event.target.value || undefined })}
    >
      <option value="">{t("Välj bok…")}</option>
      {books.map((book) => (
        <option key={book.dir} value={book.dir}>
          {book.title}
        </option>
      ))}
    </select>
  );
}

/** Bokens delar: each part ticked on or off, with its own text where it has one. */
export function Parts(props: Props) {
  const { choices, setChoices } = props;
  return PARTS.filter(([key]) => isShown(key, choices.format)).map(([key, label]) => (
    <div key={key} className="export-part">
      <label className="export-check">
        <input
          type="checkbox"
          checked={choices[key]}
          onChange={(event) => setChoices({ ...choices, [key]: event.target.checked })}
        />
        {label}
      </label>
      {isExtra(key) && choices[key] && <PartText {...props} part={key} />}
      {key === "hasExcerpt" && choices[key] && <ExcerptBook {...props} />}
    </div>
  ));
}
