import { SCENE_STATUSES, type SceneStatus } from "../manuscript/sceneFile.js";
import { t } from "../i18n/i18n.js";

/** A step as the book shows it; the scene files keep the step's fixed id. */
export interface StatusStep {
  name: string;
  /** Empty for an idea, which is only an outline. */
  color: string;
}

export const DEFAULT_STEPS: Record<SceneStatus, StatusStep> = {
  idé: { name: t("Idé"), color: "" },
  utkast: { name: t("Utkast"), color: "#e08a1e" },
  redigering: { name: t("Redigering"), color: "#2f86c9" },
  klar: { name: t("Klar"), color: "#3f9a4f" },
};

type Stored = Partial<Record<SceneStatus, Partial<StatusStep>>>;

const storedOf = (fields: Record<string, unknown>): Stored => {
  const stored = fields["statusSteps"];
  return typeof stored === "object" && stored !== null ? (stored as Stored) : {};
};

/** Only the names the writer chose, for the shelf, which has its own words otherwise. */
export function ownStepName(fields: Record<string, unknown>, status: SceneStatus) {
  const name = storedOf(fields)[status]?.name;
  return typeof name === "string" && name.trim() ? name : null;
}

/** The book's four steps, its own names and colours over the standard ones. */
export function statusSteps(fields: Record<string, unknown>): Record<SceneStatus, StatusStep> {
  const stored = storedOf(fields);
  const entries = SCENE_STATUSES.map((status) => {
    const own = stored[status];
    const color = typeof own?.color === "string" ? own.color : DEFAULT_STEPS[status].color;
    return [status, { name: ownStepName(fields, status) ?? DEFAULT_STEPS[status].name, color }];
  });
  return Object.fromEntries(entries) as Record<SceneStatus, StatusStep>;
}

/** project.json's fields with one step changed. */
export function withStep(
  fields: Record<string, unknown>,
  status: SceneStatus,
  change: Partial<StatusStep>,
) {
  const stored = storedOf(fields);
  return { statusSteps: { ...stored, [status]: { ...stored[status], ...change } } };
}
