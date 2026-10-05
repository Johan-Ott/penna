import { bookDetails, bookOutline, estimatedPages, type BookDetails } from "../../export/book.js";
import { epubCover } from "../../export/epubCover.js";
import { manuscriptWords } from "../../project/treeLabels.js";
import type { Project } from "../useProject.js";
import { PrintPreview } from "../bookdesign/PrintPreview.js";
import type { ExportState } from "./useExport.js";
import { t } from "../../i18n/i18n.js";
import { platform } from "../platform.js";

function EbookPreview({ book, coverUrl }: { book: BookDetails; coverUrl: string | null }) {
  const cover =
    coverUrl ?? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(epubCover(book))}`;
  return (
    <div className="export-preview">
      <span className="setting-hint">{t("Förhandsvisning · E-bok")}</span>
      <img className="export-cover" src={cover} alt={t("Omslaget som e-boken får")} />
    </div>
  );
}

export function Preview(props: {
  project: Project;
  generalAuthor: string;
  isEbook: boolean;
  isPrint: boolean;
  coverUrl: string | null;
}) {
  const { project, generalAuthor } = props;
  const words = manuscriptWords(project.tree, project.summaries);
  const details = bookDetails(project.fields, generalAuthor, words);
  const book = { ...details, title: details.title || project.name };
  const pages = estimatedPages(words, bookOutline(project.tree));
  if (props.isEbook) return <EbookPreview book={book} coverUrl={props.coverUrl} />;
  if (props.isPrint) return <PrintPreview project={project} generalAuthor={generalAuthor} />;
  return (
    <div className="export-preview">
      <span className="setting-hint">{t("Förhandsvisning · Standardmanus")}</span>
      <div className="export-page">
        <span className="export-page-title">{book.title}</span>
        {book.subtitle && <span className="export-page-subtitle">{book.subtitle}</span>}
        <span className="export-page-author">{book.author || t("[FÖRFATTARNAMN]")}</span>
        <span className="export-page-note">{t("Titelsida · ca {pages} sidor", { pages })}</span>
      </div>
    </div>
  );
}

type Failure = Extract<ExportState, { kind: "failed" }>;

function ExportFailure(props: {
  failure: Failure;
  onOpenScene: (title: string) => void;
  onClose: () => void;
}) {
  const { failure } = props;
  return (
    <div className="export-error" role="alert">
      <span className="progress-title">
        {t("Exporten stoppades i ”{title}”", { title: failure.sceneTitle })}
      </span>
      <span className="setting-hint">
        {t("{reason} Inget har sparats.", { reason: failure.reason })}
      </span>
      <span className="export-error-actions">
        <button
          className="button secondary small"
          onClick={() => props.onOpenScene(failure.sceneTitle)}
        >
          {t("Gå till scenen")}
        </button>
        <button className="link-button quiet" onClick={props.onClose}>
          {t("Stäng")}
        </button>
      </span>
    </div>
  );
}

function ExportRunning(props: {
  state: Extract<ExportState, { kind: "running" }>;
  onCancel: () => void;
}) {
  const { chapter, chapters } = props.state;
  return (
    <div className="export-running" role="status">
      <div className="export-running-row">
        <span>{t("Exporterar…")}</span>
        {chapters > 0 && (
          <span className="kpi-sub">
            {t("Kapitel {chapter} av {chapters}", { chapter, chapters })}
          </span>
        )}
      </div>
      <div className="progress-bar">
        <div style={{ width: `${chapters ? (100 * chapter) / chapters : 0}%` }} />
      </div>
      <button className="link-button quiet" onClick={props.onCancel}>
        {t("Avbryt")}
      </button>
    </div>
  );
}

function ExportSaved(props: {
  state: Extract<ExportState, { kind: "saved" }>;
  onClose: () => void;
}) {
  const { showInFolder } = platform;
  return (
    <div className="toast inverted" role="status">
      <span>{t("{file} är sparad", { file: props.state.fileName })}</span>
      {showInFolder && (
        <button
          className="button secondary small"
          onClick={() => void showInFolder(props.state.path)}
        >
          {t("Visa i mappen")}
        </button>
      )}
      <button className="link-button" onClick={props.onClose}>
        {t("Stäng")}
      </button>
    </div>
  );
}

export function ExportStatus(props: {
  exporter: { state: ExportState; reset: () => void; cancel: () => void };
  onOpenScene: (title: string) => void;
}) {
  const { state, reset, cancel } = props.exporter;
  if (state.kind === "failed") {
    return <ExportFailure failure={state} onOpenScene={props.onOpenScene} onClose={reset} />;
  }
  if (state.kind === "running") return <ExportRunning state={state} onCancel={cancel} />;
  if (state.kind !== "saved") return null;
  return <ExportSaved state={state} onClose={reset} />;
}
