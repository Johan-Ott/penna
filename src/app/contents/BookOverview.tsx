import { designOf, trimSize } from "../../export/bookDesign.js";
import { contentsRows } from "../../project/contents.js";
import type { PageMap } from "../../project/pageMap.js";
import {
  averagePerDay,
  daysBetween,
  finishDay,
  projectGoals,
  shortDay,
} from "../../project/progress.js";
import { KIND_LABELS } from "../../project/shelf.js";
import { dayKey, type Stats } from "../../project/stats.js";
import { statusSteps } from "../../project/statusSteps.js";
import { manuscriptWords } from "../../project/treeLabels.js";
import type { Project } from "../useProject.js";
import { numberLocale, t } from "../../i18n/i18n.js";

const format = (count: number) => count.toLocaleString(numberLocale());

// Weeks or months read more easily than many days.
function spanText(days: number) {
  if (days >= 60) return t("{count} månader", { count: Math.round(days / 30) });
  if (days >= 14) return t("{count} veckor", { count: Math.round(days / 7) });
  return days === 1 ? t("1 dag") : t("{count} dagar", { count: days });
}

function forecast(finish: string, deadline: string | null) {
  const when = t("I din takt är första utkastet klart runt {day}", { day: shortDay(finish) });
  if (!deadline) return `${when}.`;
  const margin = daysBetween(finish, deadline);
  if (margin === 0) return t("{when}, samma dag som deadline.", { when });
  return margin > 0
    ? t("{when}, {span} före deadline.", { when, span: spanText(margin) })
    : t("{when}, {span} efter deadline.", { when, span: spanText(-margin) });
}

function lengthText(project: Project, pageMap: PageMap | null, words: number, goal: number | null) {
  if (pageMap && goal && words > 0) {
    const pagesAtGoal = Math.round((goal * pageMap.pages) / words);
    return t("{pages} av cirka {total} sidor.", {
      pages: format(pageMap.pages),
      total: format(pagesAtGoal),
    });
  }
  if (goal) return t("{words} av {goal} ord.", { words: format(words), goal: format(goal) });
  const { width, height } = trimSize(designOf(project.fields).trim);
  const pages = pageMap
    ? ` · ${t("{pages} sidor i {width} × {height} mm", { pages: format(pageMap.pages), width, height })}`
    : "";
  return `${t("{count} ord", { count: format(words) })}${pages}.`;
}

/** Under the book's title: how long it is, and when the first draft is done at this pace. */
export function BookMeta(props: { project: Project; pageMap: PageMap | null; stats: Stats }) {
  const { project, pageMap, stats } = props;
  const words = manuscriptWords(project.tree, project.summaries);
  const goals = projectGoals(project.fields);
  const type = project.fields["type"];
  const kind = typeof type === "string" ? KIND_LABELS[type] : undefined;
  const today = dayKey(Date.now());
  const finish = finishDay(words, goals.totalGoal, averagePerDay(stats, today), today);
  const parts = [
    kind && `${kind}.`,
    lengthText(project, pageMap, words, goals.totalGoal),
    finish && forecast(finish, goals.deadline),
  ];
  return <span className="contents-meta">{parts.filter(Boolean).join(" ")}</span>;
}

// The pages still to write before the goal, at the book's words per page; never more than 400.
function pagesLeft(project: Project, pageMap: PageMap) {
  const words = manuscriptWords(project.tree, project.summaries);
  const goal = projectGoals(project.fields).totalGoal;
  if (!goal || words === 0) return 0;
  return Math.min(400, Math.max(0, Math.round((goal * pageMap.pages) / words) - pageMap.pages));
}

type Row = ReturnType<typeof contentsRows>[number];

function ChapterPages(props: {
  row: Row;
  first: number;
  count: number;
  color: string;
  onOpen: () => void;
}) {
  const { row, first } = props;
  const label = (index: number) =>
    t("Sida {page}, {chapter}", { page: first + index, chapter: row.title });
  return (
    <div className="page-grid-row" role="listitem">
      <span className="page-grid-label">{row.number ?? ""}</span>
      <span className="page-grid-pages">
        {Array.from({ length: props.count }, (_unused, index) => (
          <button
            key={index}
            className="page-mark"
            aria-label={label(index)}
            title={label(index)}
            style={{ background: props.color }}
            onClick={props.onOpen}
          />
        ))}
      </span>
    </div>
  );
}

function LeftPages({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <div className="page-grid-row" role="listitem">
      <span className="page-grid-label">{t("kvar")}</span>
      <span className="page-grid-pages" aria-label={t("{count} sidor kvar till målet", { count })}>
        {Array.from({ length: count }, (_unused, index) => (
          <span key={index} className="page-mark planned" />
        ))}
      </span>
    </div>
  );
}

/** One mark per printed page, in its chapter's step, and outlined pages for what is left. */
export function PageGrid(props: {
  project: Project;
  pageMap: PageMap;
  onOpenScene: (id: string) => void;
}) {
  const { project, pageMap } = props;
  const steps = statusSteps(project.fields);
  const rows = contentsRows(project.tree, project.summaries);
  return (
    <div className="page-grid" role="list" aria-label={t("Bokens sidor")}>
      {rows.map((row) => {
        const pages = pageMap.chapterPages.get(row.id);
        const open = () => row.sceneIds[0] && props.onOpenScene(row.sceneIds[0]);
        return pages ? (
          <ChapterPages
            key={row.id}
            row={row}
            first={pages.first}
            count={pages.last - pages.first + 1}
            color={steps[row.status].color || "var(--border-control)"}
            onOpen={open}
          />
        ) : null;
      })}
      <LeftPages count={pagesLeft(project, pageMap)} />
    </div>
  );
}
