import { useState } from "react";
import { headingLabel } from "../export/bookWords.js";
import { bookLanguage } from "../project/bookLanguage.js";
import { findNode, numberNodes, type TreeNode } from "../project/tree.js";
import { ChapterHeadingDialog } from "./contents/ChapterHeadingDialog.js";
import type { Project } from "./useProject.js";
import { t } from "../i18n/i18n.js";

interface PartPageProps {
  project: Project;
  chapterId: string;
  onChangeTree: (tree: TreeNode[]) => void;
}

// The part, when the chapter is its first: there the printed book has the part's own page.
function partOpenedBy(project: Project, chapterId: string) {
  const found = findNode(project.tree, chapterId);
  const part = found?.parent;
  if (!part || part.kind !== "part" || found.index !== 0) return null;
  const number = numberNodes(project.tree, "part").get(part.id) ?? 0;
  const title = part.title ?? "";
  const label = headingLabel({ kind: "part", number, title }, bookLanguage(project.fields));
  return { part, label, title };
}

/** Shown only with book type: the part's page above its first chapter, as it will print. */
export function PartPage(props: PartPageProps) {
  const [isEditing, setEditing] = useState(false);
  const opened = partOpenedBy(props.project, props.chapterId);
  if (!opened) return null;
  const { part, label, title } = opened;
  return (
    <section className="part-page" aria-label={label}>
      <button className="link-button quiet part-page-edit" onClick={() => setEditing(true)}>
        {t("Ändra delsidan")}
      </button>
      <span className="part-page-label">{label}</span>
      {title && <span className="part-page-title">{title}</span>}
      {part.epigraph && <span className="part-page-rule" aria-hidden="true" />}
      {part.epigraph && <span className="part-page-epigraph">{part.epigraph}</span>}
      {part.epigraphBy && <span className="part-page-by">{part.epigraphBy}</span>}
      {isEditing && (
        <ChapterHeadingDialog
          {...props}
          chapterId={part.id}
          chapterName={title ? `${label}. ${title}` : label}
          onClose={() => setEditing(false)}
        />
      )}
    </section>
  );
}
