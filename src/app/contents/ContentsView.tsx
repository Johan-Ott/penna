import { useState } from "react";
import type { SceneStatus } from "../../manuscript/sceneFile.js";
import { contentsRows } from "../../project/contents.js";
import type { FilterSources } from "../../project/contentsFilter.js";
import type { PageMap } from "../../project/pageMap.js";
import type { Stats } from "../../project/stats.js";
import type { TreeNode } from "../../project/tree.js";
import { ShareSpreadDialog } from "../share/ShareSpreadDialog.js";
import type { Project } from "../useProject.js";
import { BookMeta, PageGrid, TasksLink } from "./BookOverview.js";
import { ContentsBar, type ContentsShown } from "./ContentsBar.js";
import { TempoView } from "./TempoView.js";
import { ContentsList } from "./ContentsList.js";
import { pagesAtGoal } from "./ShareSpreadButton.js";
import { t } from "../../i18n/i18n.js";

export interface ContentsProps {
  project: Project;
  onOpenScene: (id: string) => void;
  onChangeTree: (tree: TreeNode[]) => void;
  onSaveFields: (fields: Record<string, unknown>) => void;
  onSetStatus: (sceneIds: string[], status: SceneStatus) => void;
  onReadBook: () => void;
  /** The drafts of the whole book. */
  onShowDrafts: () => void;
  /** Granska, with the book's open tasks. */
  onShowTasks: () => void;
  /** The printed book's pages, once they are counted; null while they are not shown. */
  pageMap: PageMap | null;
  /** The words of each day, for when the first draft is done at this pace. */
  stats: Stats;
  /** The notes and where they are named, for the filter. */
  notes: Pick<FilterSources, "cards" | "mentions"> & { manuscript: Record<string, string> };
}

// The whole book's pages as a picture: what is written, and outlined pages for what is left.
function ShareBook({ project, pageMap }: { project: Project; pageMap: PageMap }) {
  const [isOpen, setOpen] = useState(false);
  const share = {
    title: project.name,
    pages: [],
    firstNumber: 1,
    written: pageMap.pages,
    total: pagesAtGoal(project, pageMap.pages),
  };
  return (
    <>
      <button className="link-button quiet contents-read" onClick={() => setOpen(true)}>
        {t("Dela hela boken")}
      </button>
      {isOpen && <ShareSpreadDialog share={share} onClose={() => setOpen(false)} />}
    </>
  );
}

function ContentsHeader(props: ContentsProps) {
  return (
    <header className="contents-header">
      <h1>{props.project.name}</h1>
      <BookMeta project={props.project} pageMap={props.pageMap} stats={props.stats} />
      <span className="contents-links">
        <TasksLink project={props.project} onOpen={props.onShowTasks} />
        <button className="link-button quiet contents-read" onClick={props.onShowDrafts}>
          {t("Utkast")}
        </button>
        <button className="link-button quiet contents-read" onClick={props.onReadBook}>
          {t("Läs hela boken")}
        </button>
        {props.pageMap && <ShareBook project={props.project} pageMap={props.pageMap} />}
      </span>
      {props.pageMap && (
        <PageGrid project={props.project} pageMap={props.pageMap} onOpenScene={props.onOpenScene} />
      )}
    </header>
  );
}

/** Innehåll: the book at a glance, its pages, and its chapters by part to plan in. */
export function ContentsView(props: ContentsProps) {
  const [shown, setShown] = useState<ContentsShown>("las");
  const [query, setQuery] = useState("");
  const rows = contentsRows(props.project.tree, props.project.summaries);
  return (
    <main className="contents-view">
      <div className="contents-column">
        <ContentsHeader {...props} />
        <ContentsBar
          rows={rows}
          query={query}
          onQuery={setQuery}
          shown={shown}
          onShown={setShown}
        />
        {shown === "tempo" ? (
          <TempoView project={props.project} texts={props.notes.manuscript} />
        ) : (
          <ContentsList {...props} isTimeOrder={shown === "tid"} query={query} />
        )}
      </div>
    </main>
  );
}
