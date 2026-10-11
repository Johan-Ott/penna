import type { AppState } from "../App.js";
import { chapterOf } from "../../project/treeLabels.js";
import { SearchIcon } from "../shell/icons.js";
import { ReviewButton } from "../shell/Topbar.js";
import { SprintButton } from "../sprint/SprintBar.js";
import type { Project } from "../useProject.js";
import { numberLocale, t } from "../../i18n/i18n.js";

type Props = { app: AppState; project: Project };

// The tabs below lead away, so the bar has no way back.
export function TextBar({ app, project }: Props) {
  const scene = app.scene;
  const chapter = scene ? chapterOf(project.tree, scene.id) : null;
  const words = app.today.words.toLocaleString(numberLocale());
  return (
    <header className="phone-bar">
      <SprintButton />
      <span className="phone-bar-title">
        <span>{chapter?.title ?? scene?.title ?? ""}</span>
        <span className="phone-bar-sub">{t("{count} ord idag", { count: words })}</span>
      </span>
      <span className="phone-bar-end">
        <ReviewButton
          review={app.writingMode.review}
          onReview={() => app.writingMode.setReviewOpen(!app.writingMode.isReviewOpen)}
        />
        <button className="topbar-button" aria-label={t("Sök")} onClick={app.palette.open}>
          <SearchIcon />
        </button>
      </span>
    </header>
  );
}
