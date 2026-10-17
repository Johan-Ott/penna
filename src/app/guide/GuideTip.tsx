import { useEffect } from "react";
import { isSeen, markSeen, mount, skipGuide, STEPS, useGuide, type StepId } from "./guide.js";
import { t } from "../../i18n/i18n.js";

const stepClass = (id: StepId, here: StepId) => {
  if (id === here) return "here";
  return isSeen(id) ? "seen" : undefined;
};

// The guide's steps as a breadcrumb: the ones seen are ticked, the one here is marked.
function Steps({ here }: { here: StepId }) {
  return (
    <ol className="guide-steps" aria-label={t("Guiden")}>
      {STEPS.map(({ id, name }) => (
        <li
          key={id}
          className={stepClass(id, here)}
          aria-current={id === here ? "step" : undefined}
        >
          {name}
        </li>
      ))}
    </ol>
  );
}

/** The guide's tip for this part of Penna, shown the first time the writer is here. */
export function GuideTip({ step, isHere = true }: { step: StepId; isHere?: boolean }) {
  const { showing } = useGuide();
  useEffect(() => (isHere ? mount(step) : undefined), [step, isHere]);
  if (showing !== step) return null;
  const tip = STEPS.find(({ id }) => id === step);
  return (
    <aside className="guide-tip" role="note" aria-label={t("Tips")}>
      <Steps here={step} />
      <p>{tip?.text}</p>
      <div className="guide-actions">
        <button className="link-button quiet" onClick={skipGuide}>
          {t("Hoppa över guiden")}
        </button>
        <button className="button primary small" onClick={() => markSeen(step)}>
          {t("Uppfattat")}
        </button>
      </div>
    </aside>
  );
}
