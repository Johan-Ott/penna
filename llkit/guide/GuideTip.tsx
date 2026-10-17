import { useEffect } from "react";
import type { Guide } from "./guide.js";
import { t } from "../i18n.js";

const stepClass = (guide: Guide, id: string, here: string) => {
  if (id === here) return "here";
  return guide.isSeen(id) ? "seen" : undefined;
};

// The guide's steps as a breadcrumb: the ones seen are ticked, the one here is marked.
function Steps({ guide, here }: { guide: Guide; here: string }) {
  return (
    <ol className="guide-steps" aria-label={t("Guiden")}>
      {guide.steps.map(({ id, name }) => (
        <li
          key={id}
          className={stepClass(guide, id, here)}
          aria-current={id === here ? "step" : undefined}
        >
          {name}
        </li>
      ))}
    </ol>
  );
}

/** The guide's tip for this part of the app, shown the first time the user is here. */
export function GuideTip(props: { guide: Guide; step: string; isHere?: boolean }) {
  const { guide, step, isHere = true } = props;
  const showing = guide.useShowing();
  useEffect(() => (isHere ? guide.mount(step) : undefined), [guide, step, isHere]);
  if (showing !== step) return null;
  const tip = guide.steps.find(({ id }) => id === step);
  return (
    <aside className="guide-tip" role="note" aria-label={t("Tips")}>
      <Steps guide={guide} here={step} />
      <p>{tip?.text}</p>
      <div className="guide-actions">
        <button className="link-button quiet" onClick={guide.skip}>
          {t("Hoppa över guiden")}
        </button>
        <button className="button primary small" onClick={() => guide.markSeen(step)}>
          {t("Uppfattat")}
        </button>
      </div>
    </aside>
  );
}
