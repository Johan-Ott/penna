import type { ProjectDetails } from "../../project/newProject.js";
import { NarrationPicker } from "../review/NarrationPicker.js";
import { t, formatNumber } from "../../i18n/i18n.js";

// The first and last questions of a new book: what kind it is, and its title, voice and goals.
// The step between, its shape, is BookShape.

export type FieldProps = { details: ProjectDetails; onChange: (details: ProjectDetails) => void };

const TYPES: [string, string, string][] = [
  ["roman", t("Roman"), t("En lång berättelse")],
  ["noveller", t("Noveller"), t("En eller flera korta berättelser")],
  ["fackbok", t("Fackbok"), t("Kunskap, minnen eller en idé")],
  ["annat", t("Annat"), t("Något eget, du bygger det själv")],
];

export function BookTypes({ details, onChange }: FieldProps) {
  return (
    <div className="template-list" role="radiogroup" aria-label={t("Vad skriver du?")}>
      {TYPES.map(([type, label, hint]) => (
        <button
          key={type}
          type="button"
          role="radio"
          className="template-choice"
          aria-checked={details.type === type}
          onClick={() => onChange({ ...details, type })}
        >
          <span className="template-name">{label}</span>
          <span className="choice-hint">{hint}</span>
        </button>
      ))}
    </div>
  );
}

const WORDS_PER_PAGE = 250;
const numberFrom = (text: string) => Number(text.replace(/\D/g, ""));

// The whole book's goal in words, and in pages, which is how a writer often thinks of it.
function BookGoal({ details, onChange }: FieldProps) {
  const words = details.totalGoal ?? 0;
  return (
    <label className="onboarding-field">
      <span className="field-label">{t("Bokens längd i ord")}</span>
      <input
        inputMode="numeric"
        value={words ? formatNumber(words) : ""}
        placeholder={t("Inget mål")}
        onChange={(event) =>
          onChange({ ...details, totalGoal: numberFrom(event.target.value) || null })
        }
      />
      {words > 0 && (
        <span className="setting-hint">
          {t("Cirka {pages} sidor", { pages: formatNumber(Math.round(words / WORDS_PER_PAGE)) })}
        </span>
      )}
    </label>
  );
}

function GoalFields({ details, onChange }: FieldProps) {
  return (
    <div className="field-pair">
      <label className="onboarding-field">
        <span className="field-label">{t("Dagligt ordmål")}</span>
        <input
          inputMode="numeric"
          value={formatNumber(details.dailyGoal)}
          onChange={(event) => onChange({ ...details, dailyGoal: numberFrom(event.target.value) })}
        />
      </label>
      <label className="onboarding-field">
        <span className="field-label">{t("Deadline (valfritt)")}</span>
        <input
          type="date"
          value={details.deadline}
          onChange={(event) => onChange({ ...details, deadline: event.target.value })}
        />
      </label>
    </div>
  );
}

export function TitleAndGoal(props: FieldProps) {
  return (
    <>
      <label className="onboarding-field">
        <span className="field-label">{t("Titel")}</span>
        <input
          autoFocus
          placeholder={t("Arbetstitel duger")}
          value={props.details.title}
          onChange={(event) => props.onChange({ ...props.details, title: event.target.value })}
        />
      </label>
      <span className="field-label">{t("Hur berättas den?")}</span>
      <NarrationPicker
        value={props.details.narration}
        onChange={(narration) => props.onChange({ ...props.details, narration })}
      />
      <span className="setting-hint">
        {t("Granska håller koll på att texten följer det, till exempel filterord i deep POV.")}
      </span>
      <BookGoal {...props} />
      <GoalFields {...props} />
    </>
  );
}
