import { chapterRuns, type Mentions } from "../../project/cards.js";
import { CHARACTERS_ID } from "../../project/sorts.js";
import { sceneIdsIn } from "../../project/tree.js";
import { mentionedChapters } from "../notes/cardFormat.js";
import type { Project } from "../useProject.js";
import { t } from "../../i18n/i18n.js";

// Rollista: the book's people side by side, each with the first thing said of them and where
// they appear, so the whole ensemble is seen at once. A card opens the person.

function where(project: Project, mentions: Mentions | undefined) {
  const chapters = mentionedChapters(project, mentions);
  return chapters.length > 0
    ? t("Nämns i kap. {chapters}", { chapters: chapterRuns(chapters) })
    : t("Nämns inte än");
}

export function CastView(props: {
  project: Project;
  mentions: Map<string, Mentions>;
  descriptionOf: (id: string) => string;
  onOpen: (id: string) => void;
}) {
  const { project } = props;
  const people = sceneIdsIn(project.tree, CHARACTERS_ID);
  if (people.length === 0)
    return (
      <p className="cast-empty">{t("Inga personer än. Lägg till dem med + Ny anteckning.")}</p>
    );
  return (
    <div className="cast">
      {people.map((id) => (
        <button key={id} className="cast-card" onClick={() => props.onOpen(id)}>
          <span className="cast-name">{project.summaries[id]?.title ?? ""}</span>
          <span className="cast-about">{props.descriptionOf(id)}</span>
          <span className="cast-where">{where(project, props.mentions.get(id))}</span>
        </button>
      ))}
    </div>
  );
}
