import { SCENE_STATUSES, type SceneStatus } from "../../manuscript/sceneFile.js";
import { LABEL_COLORS } from "../../project/labels.js";
import { statusSteps, withStep, type StatusStep } from "../../project/statusSteps.js";
import type { Project } from "../useProject.js";
import type { ProjectChange } from "./LabelsDialog.js";
import { t } from "../../i18n/i18n.js";

// An empty colour is the outline an idea has; the rest are the labels' colours.
const COLORS = ["", ...LABEL_COLORS];
const nextColor = (color: string) => COLORS[(COLORS.indexOf(color) + 1) % COLORS.length] ?? "";

type Save = (status: SceneStatus, change: { name?: string; color?: string }) => void;

function StepRow({ status, step, save }: { status: SceneStatus; step: StatusStep; save: Save }) {
  return (
    <li className="label-row">
      <button
        className={`label-color${step.color ? "" : " outlined"}`}
        aria-label={t("Byt färg på {name}", { name: step.name })}
        style={{ background: step.color }}
        onClick={() => save(status, { color: nextColor(step.color) })}
      />
      <input
        className="label-name"
        aria-label={t("Namn på steget {name}", { name: step.name })}
        defaultValue={step.name}
        onBlur={(event) =>
          event.target.value.trim() && save(status, { name: event.target.value.trim() })
        }
      />
    </li>
  );
}

/** The book's four steps: each can have its own name and colour; the scene files keep the step. */
export function StatusStepsEditor(props: {
  project: Project;
  onUpdate: (change: ProjectChange) => void;
}) {
  const { fields } = props.project;
  const steps = statusSteps(fields);
  const save: Save = (status, change) =>
    props.onUpdate({ fields: withStep(fields, status, change) });
  return (
    <ul className="label-list" aria-label={t("Status")}>
      {SCENE_STATUSES.map((status) => (
        <StepRow key={status} status={status} step={steps[status]} save={save} />
      ))}
    </ul>
  );
}
