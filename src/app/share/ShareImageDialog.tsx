import { useEffect, useRef, useState } from "react";
import { designOf } from "../../export/bookDesign.js";
import { chapterOf } from "../../project/treeLabels.js";
import { Choice, Dialog } from "../controls.js";
import { recordFailure } from "../errorLog.js";
import { platform } from "../platform.js";
import type { Project } from "../useProject.js";
import {
  drawExcerpt,
  MOST_CHARACTERS,
  type Excerpt,
  type ExcerptFormat,
  type ExcerptLook,
} from "./excerptImage.js";
import { closeExcerpt, useShownExcerpt } from "./shareExcerpt.js";
import { earnBadge } from "../journey/journeyEvents.js";
import { t } from "../../i18n/i18n.js";

const PNG = { name: t("Bild"), extension: "png" };

// The book's own author name wins over the general one; the chapter says where it is from.
function excerptOf(
  text: string,
  project: Project,
  author: string,
  sceneId: string | null,
): Excerpt {
  const own = project.fields["author"];
  const name = typeof own === "string" && own.trim() ? own : author;
  const chapter = sceneId ? chapterOf(project.tree, sceneId) : null;
  const where = chapter ? t("Kapitel {number}", { number: chapter.number }) : "";
  return {
    text,
    title: project.name,
    byline: [where, name].filter(Boolean).join(" · "),
    font: designOf(project.fields).bodyFont,
  };
}

async function savePicture(canvas: HTMLCanvasElement, title: string) {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return;
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (await platform.saveFile(`${title} – utdrag.png`, bytes, PNG)) earnBadge("ut-i-varlden");
}

// The book's font is loaded first, or the canvas would draw the excerpt in a fallback.
function usePicture(excerpt: Excerpt, format: ExcerptFormat, look: ExcerptLook) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    void document.fonts.load(`48px "${excerpt.font}"`).finally(() => {
      if (canvas.current) drawExcerpt(canvas.current, excerpt, format, look);
    });
  }, [excerpt, format, look]);
  return canvas;
}

const formats = (): [ExcerptFormat, string][] => [
  ["staende", t("Stående")],
  ["kvadrat", t("Kvadrat")],
];
const looks = (): [ExcerptLook, string][] => [
  ["papper", t("Papper")],
  ["mork", t("Mörk")],
  ["minimal", t("Minimal")],
];

function SharePicture({ excerpt }: { excerpt: Excerpt }) {
  const [format, setFormat] = useState<ExcerptFormat>("staende");
  const [look, setLook] = useState<ExcerptLook>("papper");
  const canvas = usePicture(excerpt, format, look);
  const save = () =>
    canvas.current && void savePicture(canvas.current, excerpt.title).catch(recordFailure("Bild"));
  return (
    <>
      <Choice label={t("Format")} value={format} options={formats()} onSelect={setFormat} />
      <Choice label={t("Stil")} value={look} options={looks()} onSelect={setLook} />
      <canvas ref={canvas} className={`excerpt-preview ${format}`} aria-label={t("Bilden")} />
      <span className="setting-hint">
        {t("Högst {count} tecken. Resten av manuset stannar hos dig.", { count: MOST_CHARACTERS })}
      </span>
      <div className="dialog-actions">
        <button className="button primary" onClick={save}>
          {platform.shareFile ? t("Dela bild") : t("Spara bild")}
        </button>
      </div>
    </>
  );
}

/** The excerpt chosen in the selection bar, as a picture in the book's type, to save and share. */
export function ShareImageDialog(props: {
  project: Project | null;
  author: string;
  sceneId: string | null;
}) {
  const text = useShownExcerpt();
  if (!text || !props.project) return null;
  return (
    <Dialog label={t("Dela utdrag")} className="share-dialog" onClose={closeExcerpt}>
      <SharePicture excerpt={excerptOf(text, props.project, props.author, props.sceneId)} />
    </Dialog>
  );
}
