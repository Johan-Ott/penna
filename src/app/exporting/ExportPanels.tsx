import { bookDetails, bookOutline, estimatedPages, type BookDetails } from "../../export/book.js";
import { epubCover } from "../../export/epubCover.js";
import { manuscriptWords } from "../../project/treeLabels.js";
import type { Project } from "../useProject.js";
import { PrintPreview } from "../bookdesign/PrintPreview.js";
import type { ExportState } from "./useExport.js";

// The writer's picture, or the typographic cover the e-book gets without one.
function EbookPreview({ book, coverUrl }: { book: BookDetails; coverUrl: string | null }) {
  const cover =
    coverUrl ?? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(epubCover(book))}`;
  return (
    <div className="export-preview">
      <span className="setting-hint">Förhandsvisning · E-bok</span>
      <img className="export-cover" src={cover} alt="Omslaget som e-boken får" />
    </div>
  );
}

/** The title page as the export will write it, with the pages the manuscript will fill. */
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
      <span className="setting-hint">Förhandsvisning · Standardmanus</span>
      <div className="export-page">
        <span className="export-page-title">{book.title}</span>
        {book.subtitle && <span className="export-page-subtitle">{book.subtitle}</span>}
        <span className="export-page-author">{book.author || "[FÖRFATTARNAMN]"}</span>
        <span className="export-page-note">Titelsida · ca {pages} sidor</span>
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
      <span className="progress-title">Exporten stoppades i ”{failure.sceneTitle}”</span>
      <span className="setting-hint">{failure.reason} Inget har sparats.</span>
      <span className="export-error-actions">
        <button
          className="button secondary small"
          onClick={() => props.onOpenScene(failure.sceneTitle)}
        >
          Gå till scenen
        </button>
        <button className="link-button quiet" onClick={props.onClose}>
          Stäng
        </button>
      </span>
    </div>
  );
}

/** Klar and fel, as the design shows them; pågår shows on the export button. */
export function ExportStatus(props: {
  state: ExportState;
  onOpenScene: (title: string) => void;
  onClose: () => void;
}) {
  const { state } = props;
  if (state.kind === "failed") return <ExportFailure {...props} failure={state} />;
  if (state.kind !== "saved") return null;
  return (
    <div className="toast inverted" role="status">
      <span>{state.fileName} är sparad</span>
      <button className="link-button" onClick={props.onClose}>
        Stäng
      </button>
    </div>
  );
}
