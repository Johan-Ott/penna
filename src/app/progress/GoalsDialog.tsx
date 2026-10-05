import { useState } from "react";
import { projectGoals } from "../../project/progress.js";
import { useEscape } from "../useShortcut.js";
import { t } from "../../i18n/i18n.js";

interface GoalsDialogProps {
  fields: Record<string, unknown>;
  onSave: (fields: Record<string, unknown>) => void;
  onClose: () => void;
}

type GoalKey = "dailyGoal" | "totalGoal" | "deadline";
type GoalForm = Record<GoalKey, string>;

const FIELDS: [GoalKey, string, string][] = [
  ["dailyGoal", t("Dagligt ordmål"), t("Det som räknas i Idag.")],
  ["totalGoal", t("Slutmål"), t("Hur långt manuset ska bli, i ord.")],
  ["deadline", t("Deadline"), t("Lämna tom om det inte finns någon.")],
];

const wholeNumber = (text: string) => {
  const value = Math.round(Number(text.replace(/\s/g, "")));
  return value > 0 ? value : undefined;
};

// An empty field removes that goal; undefined values are left out of project.json.
const fieldsOf = (form: GoalForm) => ({
  dailyGoal: wholeNumber(form.dailyGoal),
  totalGoal: wholeNumber(form.totalGoal),
  deadline: form.deadline || undefined,
});

function formOf(fields: Record<string, unknown>): GoalForm {
  const goals = projectGoals(fields);
  return {
    dailyGoal: String(goals.dailyGoal ?? ""),
    totalGoal: String(goals.totalGoal ?? ""),
    deadline: goals.deadline ?? "",
  };
}

function GoalFields({ form, onChange }: { form: GoalForm; onChange: (form: GoalForm) => void }) {
  return FIELDS.map(([key, label, hint]) => (
    <label key={key} className="onboarding-field">
      <span className="field-label">{label}</span>
      <input
        type={key === "deadline" ? "date" : "number"}
        min={key === "deadline" ? undefined : 1}
        value={form[key]}
        onChange={(event) => onChange({ ...form, [key]: event.target.value })}
      />
      <span className="setting-hint">{hint}</span>
    </label>
  ));
}

export function GoalsDialog({ fields, onSave, onClose }: GoalsDialogProps) {
  const [form, setForm] = useState(() => formOf(fields));
  useEscape(onClose);
  const save = () => {
    onSave(fieldsOf(form));
    onClose();
  };
  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div
        className="dialog goals-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t("Mål för projektet")}
        onClick={(event) => event.stopPropagation()}
      >
        <span className="dialog-title">{t("Mål för projektet")}</span>
        <GoalFields form={form} onChange={setForm} />
        <div className="dialog-actions">
          <button className="button secondary" onClick={onClose}>
            {t("Avbryt")}
          </button>
          <button className="button primary" onClick={save}>
            {t("Spara")}
          </button>
        </div>
      </div>
    </div>
  );
}
