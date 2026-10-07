import { useEffect, useRef, useState } from "react";
import { designOf } from "../../export/bookDesign.js";
import { Choice, Dialog } from "../controls.js";
import { recordFailure } from "../errorLog.js";
import { platform } from "../platform.js";
import type { Project } from "../useProject.js";
import { drawExcerpt, type Excerpt, type ExcerptFormat } from "./excerptImage.js";
import { closeExcerpt, useShownExcerpt } from "./shareExcerpt.js";
import { t } from "../../i18n/i18n.js";

const PNG = { name: t("Bild"), extension: "png" };

function excerptOf(text: string, project: Project, author: string): Excerpt {
  const own = project.fields["author"];
  return {
    text,
    title: project.name,
    author: typeof own === "string" && own.trim() ? own : author,
    font: designOf(project.fields).bodyFont,
  };
}

async function savePicture(canvas: HTMLCanvasElement, title: string) {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return;
  await platform.saveFile(`${title} – utdrag.png`, new Uint8Array(await blob.arrayBuffer()), PNG);
}

// The book's font is loaded first, or the canvas would draw the excerpt in a fallback.
function usePicture(excerpt: Excerpt, format: ExcerptFormat) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    void document.fonts.load(`48px "${excerpt.font}"`).finally(() => {
      if (canvas.current) drawExcerpt(canvas.current, excerpt, format);
    });
  }, [excerpt, format]);
  return canvas;
}

function SharePicture({ excerpt }: { excerpt: Excerpt }) {
  const [format, setFormat] = useState<ExcerptFormat>("staende");
  const canvas = usePicture(excerpt, format);
  const save = () =>
    canvas.current && void savePicture(canvas.current, excerpt.title).catch(recordFailure("Bild"));
  const formats: [ExcerptFormat, string][] = [
    ["staende", t("Stående")],
    ["kvadrat", t("Kvadrat")],
  ];
  return (
    <>
      <Choice label={t("Format")} value={format} options={formats} onSelect={setFormat} />
      <canvas ref={canvas} className={`excerpt-preview ${format}`} aria-label={t("Bilden")} />
      <div className="dialog-actions">
        <button className="button primary" onClick={save}>
          {t("Spara bild")}
        </button>
      </div>
    </>
  );
}

/** The excerpt chosen in the selection bar, as a picture in the book's type, to save and share. */
export function ShareImageDialog({ project, author }: { project: Project | null; author: string }) {
  const text = useShownExcerpt();
  if (!text || !project) return null;
  return (
    <Dialog label={t("Dela som bild")} className="share-dialog" onClose={closeExcerpt}>
      <SharePicture excerpt={excerptOf(text, project, author)} />
    </Dialog>
  );
}
