import type { ProjectDetails } from "../../project/newProject.js";
import { NarrationPicker } from "../review/NarrationPicker.js";
import { PieceToggles } from "../templates/TemplateChoices.js";
import { t, formatNumber } from "../../i18n/i18n.js";

// The questions of a new book, one step each: what kind, which pieces and how it is told, and
// its title and goal. Penna's suggestion for the parts and chapters is the step between.

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

export function StoryPieces({ details, onChange }: FieldProps) {
  return (
    <>
      <p className="setting-hint">
        {t("Välj så många som passar, eller inga alls. Du kan lägga till fler senare.")}
      </p>
      <PieceToggles
        chosen={details.pieces}
        onChange={(pieces) => onChange({ ...details, pieces })}
      />
      <span className="field-label">{t("Hur berättas den?")}</span>
      <NarrationPicker
        value={details.narration}
        onChange={(narration) => onChange({ ...details, narration })}
      />
      <span className="setting-hint">
        {t("Granska håller koll på att texten följer det, till exempel filterord i deep POV.")}
      </span>
    </>
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
          onChange={(event) =>
            onChange({ ...details, dailyGoal: Number(event.target.value.replace(/\D/g, "")) })
          }
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
      <GoalFields {...props} />
    </>
  );
}
