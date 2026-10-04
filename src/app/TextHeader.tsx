import { withNodeText } from "../project/contents.js";
import { findNode, type TreeNode } from "../project/tree.js";
import { chapterOf } from "../project/treeLabels.js";
import type { Project } from "./useProject.js";
import { t } from "../i18n/i18n.js";

interface TextHeaderProps {
  project: Project;
  sceneId: string;
  onChangeTree: (tree: TreeNode[]) => void;
  onReadChapter: (chapterId: string) => void;
}

// "När: dag 3, kväll", written straight into the header and saved when it is left.
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

// "Kapitel 8 · Köket", and the node whose "När" is shown: the chapter, or a loose scene itself.
function headingOf(project: Project, sceneId: string) {
  const chapter = chapterOf(project.tree, sceneId);
  const title = project.summaries[sceneId]?.title ?? "";
  const whenId = chapter?.id ?? sceneId;
  const place = chapter
    ? t("Kapitel {number} · {title}", { number: chapter.number, title })
    : title;
  return { chapter, place, whenId, when: findNode(project.tree, whenId)?.node.when ?? "" };
}

/**
 * Above a scene: "Kapitel 8 · Köket", and when it happens. The chapter's title opens its first
 * scene, as in a printed book. "När" belongs to the chapter, as in Innehåll.
 */
export function TextHeader({ project, sceneId, onChangeTree, onReadChapter }: TextHeaderProps) {
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
        </span>
        <WhenField
          when={when}
          onSave={(text) => onChangeTree(withNodeText(project.tree, whenId, "when", text))}
        />
      </div>
      {chapter?.isFirstScene && <h1 className="chapter-title">{chapter.title}</h1>}
    </header>
  );
}
