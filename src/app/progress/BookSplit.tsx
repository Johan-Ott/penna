import { SCENE_STATUSES } from "../../manuscript/sceneFile.js";
import { wordsByLabel, wordsByStatus } from "../../project/bookNumbers.js";
import { labelsOf } from "../../project/labels.js";
import { statusSteps } from "../../project/statusSteps.js";
import type { Project } from "../useProject.js";
import { numberLocale, t } from "../../i18n/i18n.js";

const format = (words: number) => words.toLocaleString(numberLocale());

/** How far the book has come, as one bar in the steps' colours. */
export function WordsByStatus({ project }: { project: Project }) {
  const words = wordsByStatus(project.tree, project.summaries);
  const steps = statusSteps(project.fields);
  const total = SCENE_STATUSES.reduce((sum, status) => sum + words[status], 0);
  if (total === 0) return null;
  return (
    <section className="progress-section">
      <span className="progress-label">{t("Ord per steg")}</span>
      <div className="status-split" aria-hidden="true">
        {SCENE_STATUSES.map((status) => (
          <span
            key={status}
            style={{
              flexGrow: words[status],
              background: steps[status].color || "var(--border-control)",
            }}
          />
        ))}
      </div>
      <div className="status-legend">
        {SCENE_STATUSES.filter((status) => words[status] > 0).map((status) => (
          <span key={status}>
            {steps[status].name} {format(words[status])}
          </span>
        ))}
      </div>
    </section>
  );
}

/** The words under each of the book's labels; a scene can count under several. */
export function WordsByLabel({ project }: { project: Project }) {
  // Only the labels in use; a label on no text says nothing here.
  const used = wordsByLabel(project.tree, project.summaries, labelsOf(project.fields)).filter(
    ({ words }) => words > 0,
  );
  if (used.length === 0) return null;
  return (
    <section className="progress-section">
      <span className="progress-label">{t("Ord per label")}</span>
      {used.map(({ label, words }) => (
        <div key={label.id} className="chapter-bar">
          <span className="chapter-name">
            <span className="tree-dot" style={{ background: label.color }} /> {label.name}
          </span>
          <span className="progress-label">{format(words)}</span>
        </div>
      ))}
    </section>
  );
}
