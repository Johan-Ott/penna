import { useState } from "react";
import type { PageMap } from "../../project/pageMap.js";
import { Row } from "./ContentsRowView.js";
import type { SceneStatus } from "../../manuscript/sceneFile.js";
import {
  contentsRows,
  inTimeOrder,
  movedInTime,
  type ContentsRow,
} from "../../project/contents.js";
import type { TreeNode } from "../../project/tree.js";
import type { Project } from "../useProject.js";
import type { Stats } from "../../project/stats.js";
import { BookMeta, PageGrid } from "./BookOverview.js";
import { rowMatches, type FilterSources } from "../../project/contentsFilter.js";
import { t } from "../../i18n/i18n.js";

interface ContentsProps {
  project: Project;
  onOpenScene: (id: string) => void;
  onChangeTree: (tree: TreeNode[]) => void;
  onSaveFields: (fields: Record<string, unknown>) => void;
  onSetStatus: (sceneIds: string[], status: SceneStatus) => void;
  onReadBook: () => void;
  /** The drafts of the whole book. */
  onShowDrafts: () => void;
  /** The printed book's pages, once they are counted; null while they are not shown. */
  pageMap: PageMap | null;
  /** The words of each day, for when the first draft is done at this pace. */
  stats: Stats;
  /** The notes and where they are named, for the filter. */
  notes: Pick<FilterSources, "cards" | "mentions">;
}

const timeOrderOf = (fields: Record<string, unknown>) => {
  const stored = fields["timeOrder"];
  return Array.isArray(stored) ? stored.filter((id): id is string => typeof id === "string") : [];
};

function useRowDrag(shown: ContentsRow[], onOrder: (order: string[]) => void) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  return {
    propsFor: (id: string) => ({
      draggable: true,
      onDragStart: () => setDraggedId(id),
      onDragOver: (event: { preventDefault: () => void }) => event.preventDefault(),
      onDrop: () => {
        if (draggedId && draggedId !== id) {
          const index = shown.findIndex((row) => row.id === id);
          onOrder(movedInTime(shown, draggedId, index));
        }
        setDraggedId(null);
      },
      onDragEnd: () => setDraggedId(null),
    }),
  };
}

function OrderSwitch(props: { isTimeOrder: boolean; onChange: (isTimeOrder: boolean) => void }) {
  const option = (label: string, isTimeOrder: boolean) => (
    <button
      role="radio"
      aria-checked={props.isTimeOrder === isTimeOrder}
      onClick={() => props.onChange(isTimeOrder)}
    >
      {label}
    </button>
  );
  return (
    <div className="segmented small" role="radiogroup" aria-label={t("Ordning")}>
      {option(t("Läsordning"), false)}
      {option(t("Tidsordning"), true)}
    </div>
  );
}

function ContentsHeader(props: ContentsProps) {
  return (
    <header className="contents-header">
      <h1>{props.project.name}</h1>
      <BookMeta project={props.project} pageMap={props.pageMap} stats={props.stats} />
      <span className="contents-links">
        <button className="link-button quiet contents-read" onClick={props.onReadBook}>
          {t("Läs hela boken")}
        </button>
        <button className="link-button quiet contents-read" onClick={props.onShowDrafts}>
          {t("Utkast")}
        </button>
      </span>
      {props.pageMap && (
        <PageGrid project={props.project} pageMap={props.pageMap} onOpenScene={props.onOpenScene} />
      )}
    </header>
  );
}

// Rows without the person, place or label asked for fade, so the rest of the book stays in view.
function ContentsFilter(props: { query: string; onQuery: (query: string) => void }) {
  return (
    <label className="contents-filter">
      <input
        aria-label={t("Filtrera")}
        placeholder={t("Visa var en person, plats eller label finns")}
        value={props.query}
        onChange={(event) => props.onQuery(event.target.value)}
      />
      {props.query && (
        <button
          className="icon-button"
          aria-label={t("Rensa filtret")}
          onClick={() => props.onQuery("")}
        >
          ×
        </button>
      )}
    </label>
  );
}

function ContentsList(props: ContentsProps & { isTimeOrder: boolean; query: string }) {
  const { project, isTimeOrder, query } = props;
  const sources = { tree: project.tree, fields: project.fields, ...props.notes };
  const rows = contentsRows(project.tree, project.summaries);
  const shown = isTimeOrder ? inTimeOrder(rows, timeOrderOf(project.fields)) : rows;
  const drag = useRowDrag(shown, (timeOrder) => props.onSaveFields({ timeOrder }));
  if (rows.length === 0) return <p className="contents-empty">{t("Inga kapitel än.")}</p>;
  return (
    <div className="contents-list">
      {shown.map((row) => (
        <Row
          key={row.id}
          {...props}
          row={row}
          pages={props.pageMap?.chapterPages.get(row.id) ?? null}
          dragProps={isTimeOrder ? drag.propsFor(row.id) : {}}
          isDimmed={!rowMatches(sources, row, query)}
        />
      ))}
    </div>
  );
}

export function ContentsView(props: ContentsProps) {
  const [isTimeOrder, setTimeOrder] = useState(false);
  const [query, setQuery] = useState("");
  return (
    <main className="contents-view">
      <div className="contents-column">
        <ContentsHeader {...props} />
        <div className="contents-bar">
          <ContentsFilter query={query} onQuery={setQuery} />
          <OrderSwitch isTimeOrder={isTimeOrder} onChange={setTimeOrder} />
        </div>
        <ContentsList {...props} isTimeOrder={isTimeOrder} query={query} />
      </div>
    </main>
  );
}
