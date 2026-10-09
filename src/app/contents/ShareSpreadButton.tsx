import { useState, type RefObject } from "react";
import { projectGoals } from "../../project/progress.js";
import { manuscriptWords } from "../../project/treeLabels.js";
import { ShareSpreadDialog, type SpreadShare } from "../share/ShareSpreadDialog.js";
import { spreadPages } from "../share/spreadPages.js";
import type { Project } from "../useProject.js";
import { t } from "../../i18n/i18n.js";

// The pages still to write at the book's words per page, so Hela boken shows what is left too.
export function pagesAtGoal(project: Project, written: number) {
  const words = manuscriptWords(project.tree, project.summaries);
  const goal = projectGoals(project.fields).totalGoal;
  if (!goal || words === 0) return written;
  return Math.min(480, Math.max(written, Math.round((written * goal) / words)));
}

/** In Läs som bok's header: the spread on show, taken as it is when the button is pressed. */
export function ShareSpreadButton(props: {
  flow: RefObject<HTMLDivElement | null>;
  project: Project;
  first: number;
  perSpread: number;
  count: number;
}) {
  const [share, setShare] = useState<SpreadShare | null>(null);
  const open = () => {
    if (!props.flow.current) return;
    setShare({
      title: props.project.name,
      pages: spreadPages(props.flow.current, props.first, props.perSpread),
      firstNumber: props.first + 1,
      written: props.count,
      total: pagesAtGoal(props.project, props.count),
    });
  };
  return (
    <>
      <button className="button primary small" onClick={open}>
        {t("Dela uppslag")}
      </button>
      {share && <ShareSpreadDialog share={share} onClose={() => setShare(null)} />}
    </>
  );
}
