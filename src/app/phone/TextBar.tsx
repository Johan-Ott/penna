import type { AppState } from "../App.js";
import { chapterOf } from "../../project/treeLabels.js";
import { PhoneBarStart, SearchButton } from "./PhoneBarStart.js";
import { ReviewButton } from "../shell/Topbar.js";
import { SprintButton } from "../sprint/SprintBar.js";
import type { Project } from "../useProject.js";
import { t, formatNumber } from "../../i18n/i18n.js";

type Props = { app: AppState; project: Project };

// The tabs below lead away, so the bar has no way back; the sprint's clock is the text's own.
export function TextBar({ app, project }: Props) {
  const scene = app.scene;
  const chapter = scene ? chapterOf(project.tree, scene.id) : null;
  const words = formatNumber(app.today.words);
  return (
    <header className="phone-bar">
      <PhoneBarStart app={app} project={project} />
      <span className="phone-bar-title">
        <span>{chapter?.title ?? scene?.title ?? ""}</span>
        <span className="phone-bar-sub">{t("{count} ord idag", { count: words })}</span>
      </span>
      <span className="phone-bar-end">
        <SprintButton />
        <ReviewButton
          review={app.writingMode.review}
          onReview={() => app.writingMode.setReviewOpen(!app.writingMode.isReviewOpen)}
        />
        <SearchButton app={app} />
      </span>
    </header>
  );
}
