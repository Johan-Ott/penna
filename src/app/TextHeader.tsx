import { withNodeText } from "../project/contents.js";
import { findNode, type TreeNode } from "../project/tree.js";
import { chapterOf, type SceneChapter } from "../project/treeLabels.js";
import type { Project } from "./useProject.js";
import { chapterLabel, isBareNumber } from "./bookLook.js";
import { t } from "../i18n/i18n.js";

interface TextHeaderProps {
  project: Project;
  sceneId: string;
  onChangeTree: (tree: TreeNode[]) => void;
  onReadChapter: (chapterId: string) => void;
  /** The scene's saved versions, at hand where the text begins. */
  onShowVersions: (sceneId: string) => void;
}

function WhenField(props: { when: string; onSave: (text: string) => void }) {
  return (
    <label className="eyebrow-end text-when">
      <span>{t("När:")}</span>
      <input
        key={props.when}
        aria-label={t("När händer det?")}
        placeholder={t("ange")}
        defaultValue={props.when}
        onBlur={(event) => event.target.value !== props.when && props.onSave(event.target.value)}
        onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
      />
    </label>
  );
}

// "När" belongs to the chapter, or to a scene that is not in a chapter.
function headingOf(project: Project, sceneId: string) {
  const chapter = chapterOf(project.tree, sceneId);
  const title = project.summaries[sceneId]?.title ?? "";
  const whenId = chapter?.id ?? sceneId;
  const place = chapter
    ? t("Kapitel {number} · {title}", { number: chapter.number, title })
    : title;
  return { chapter, place, whenId, when: findNode(project.tree, whenId)?.node.when ?? "" };
}

// The number shows only with book type, as the printed book numbers it above the title.
function ChapterOpening({ chapter, fields }: { chapter: SceneChapter; fields: Project["fields"] }) {
  const label = chapterLabel(fields, chapter.number, chapter.title);
  return (
    <>
      {label && (
        <span className={isBareNumber(fields) ? "chapter-number bare" : "chapter-number"}>
          {label}
        </span>
      )}
      <h1 className="chapter-title">{chapter.title}</h1>
    </>
  );
}

export function TextHeader(props: TextHeaderProps) {
  const { project, sceneId, onChangeTree, onReadChapter } = props;
  const { chapter, place, whenId, when } = headingOf(project, sceneId);
  return (
    <header className="text-header">
      <div className="text-eyebrow">
        <span className="text-place">
          {place}
          {chapter && (
            <button className="read-link" onClick={() => onReadChapter(chapter.id)}>
              {t("Läs kapitlet")}
            </button>
          )}
          <button className="read-link" onClick={() => props.onShowVersions(sceneId)}>
            {t("Versioner")}
          </button>
        </span>
        <WhenField
          when={when}
          onSave={(text) => onChangeTree(withNodeText(project.tree, whenId, "when", text))}
        />
      </div>
      {chapter?.isFirstScene && <ChapterOpening chapter={chapter} fields={project.fields} />}
    </header>
  );
}
