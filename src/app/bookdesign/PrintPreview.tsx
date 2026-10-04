import { useEffect, useRef } from "react";
import type { Project } from "../useProject.js";
import { framePages } from "./framePages.js";
import { usePrintPreview } from "./usePrintPreview.js";
import { t } from "../../i18n/i18n.js";

// Frames the pages each time Typst has drawn a new SVG into the container.
function usePageFrames(svg: string | null) {
  const pages = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const drawn = pages.current?.querySelector("svg");
    if (svg && drawn) framePages(drawn);
  }, [svg]);
  return pages;
}

/**
 * The first chapter as it will be printed. The SVG is drawn by Typst from the writer's own
 * text on this computer, never from outside, so it is set straight into the page.
 */
export function PrintPreview({
  project,
  generalAuthor,
}: {
  project: Project;
  generalAuthor: string;
}) {
  const preview = usePrintPreview(project, generalAuthor);
  const pages = usePageFrames(preview.kind === "ready" ? preview.svg : null);
  return (
    <div className="print-preview">
      <span className="setting-hint">{t("Förhandsvisning · första kapitlet")}</span>
      {preview.kind === "working" && <p className="kpi-sub">{t("Sätter boken…")}</p>}
      {preview.kind === "failed" && (
        <p className="kpi-sub" role="alert">
          {preview.reason}
        </p>
      )}
      {preview.kind === "ready" && (
        <div
          ref={pages}
          className="print-pages"
          dangerouslySetInnerHTML={{ __html: preview.svg }}
        />
      )}
    </div>
  );
}
