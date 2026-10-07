import { useState } from "react";
import { draftDir, type Draft } from "../../project/drafts.js";
import { snapshotWhen } from "../../project/snapshots.js";
import { findNode } from "../../project/tree.js";
import { nodeLabel } from "../../project/treeLabels.js";
import { Choice, Dialog } from "../controls.js";
import type { Project } from "../useProject.js";
import type { Drafts } from "./useDrafts.js";
import { numberLocale, t } from "../../i18n/i18n.js";

const BOOK = "bok";

function scopeLabel(project: Project, chapterId: string | null) {
  const chapter = chapterId ? findNode(project.tree, chapterId)?.node : null;
  return chapter ? nodeLabel(chapter, project.tree, project.summaries) : t("Hela boken");
}

// The name is the writer's; the default only counts the drafts there are.
function SaveDraft({ drafts, project }: { drafts: Drafts; project: Project }) {
  const chapterId = drafts.opened?.chapterId ?? null;
  const [name, setName] = useState(t("Utkast {number}", { number: drafts.drafts.length + 1 }));
  const [scope, setScope] = useState(chapterId ?? BOOK);
  const options: [string, string][] = [
    ...(chapterId ? [[chapterId, scopeLabel(project, chapterId)] as [string, string]] : []),
    [BOOK, t("Hela boken")],
  ];
  const save = () => {
    if (!name.trim()) return;
    drafts.save(name.trim(), scope === BOOK ? null : scope);
    setName(t("Utkast {number}", { number: drafts.drafts.length + 2 }));
  };
  return (
    <form className="draft-save" onSubmit={(event) => (event.preventDefault(), save())}>
      <input
        aria-label={t("Utkastets namn")}
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      {options.length > 1 && (
        <Choice label={t("Vad som sparas")} value={scope} options={options} onSelect={setScope} />
      )}
      <button type="submit" className="button primary small" disabled={!name.trim()}>
        {t("Spara utkast")}
      </button>
    </form>
  );
}

type RowProps = {
  draft: Draft;
  project: Project;
  drafts: Drafts;
  onBeside: (draft: Draft) => void;
};

const metaOf = (project: Project, draft: Draft) =>
  [
    scopeLabel(project, draft.chapterId),
    snapshotWhen(draft.time, Date.now()),
    t("{count} ord", { count: draft.words.toLocaleString(numberLocale()) }),
  ].join(" · ");

function DraftRow(props: RowProps) {
  const { draft, project, drafts } = props;
  const meta = metaOf(project, draft);
  return (
    <li className="draft-row">
      <span className="draft-text">
        <span className="draft-name">{draft.name}</span>
        <span className="draft-meta">{meta}</span>
      </span>
      <button className="link-button" onClick={() => props.onBeside(draft)}>
        {t("Läs bredvid")}
      </button>
      <button className="link-button" onClick={() => drafts.restore(draft)}>
        {t("Återställ")}
      </button>
      <button
        className="icon-button"
        aria-label={t("Ta bort {name}", { name: draft.name })}
        onClick={() => drafts.remove(draft)}
      >
        ×
      </button>
    </li>
  );
}

/** A chapter or the whole book saved under a name; read beside the text, put back or removed. */
export function DraftsLayer(props: {
  drafts: Drafts;
  project: Project | null;
  onBeside: (draft: Draft) => void;
}) {
  const { drafts, project } = props;
  if (!drafts.opened || !project) return null;
  return (
    <Dialog label={t("Utkast")} className="labels-dialog" onClose={drafts.close}>
      <SaveDraft drafts={drafts} project={project} />
      {drafts.drafts.length === 0 && <p className="dialog-text">{t("Inga sparade utkast än.")}</p>}
      <ul className="label-list">
        {drafts.drafts.map((draft) => (
          <DraftRow
            key={draft.id}
            draft={draft}
            project={project}
            drafts={drafts}
            onBeside={props.onBeside}
          />
        ))}
      </ul>
      <p className="dialog-text">
        {t("Återställ sparar först texten som den är nu under Versioner.")}
      </p>
    </Dialog>
  );
}

/** Where a draft's first scene is read from, for the pane beside the text. */
export const draftBeside = (project: Project, draft: Draft) => {
  const sceneId = draft.sceneIds[0];
  return sceneId ? { kind: "text" as const, dir: draftDir(project.dir, draft.id), sceneId } : null;
};
