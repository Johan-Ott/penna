import { useEffect, useState } from "react";
import { previewOutline } from "../../export/bookDesign.js";
import { headingLabel } from "../../export/bookWords.js";
import { EBOOK_STYLE } from "../../export/epub.js";
import { escapeXml, sceneXhtml } from "../../export/xhtml.js";
import { bookLanguage, quoteStyleFor } from "../../project/bookLanguage.js";
import { t } from "../../i18n/i18n.js";
import type { Project } from "../useProject.js";
import { bookMaterial } from "../exporting/bookMaterial.js";

async function ebookPage(project: Project, generalAuthor: string) {
  const material = await bookMaterial(project, generalAuthor);
  const language = bookLanguage(project.fields);
  const typography = quoteStyleFor(language);
  const body = previewOutline(material.outline).map((item) => {
    if (item.kind === "scene") {
      const doc = material.scenes.get(item.id);
      return doc ? sceneXhtml(doc, typography) : "";
    }
    const title = item.title ? `<br />${escapeXml(item.title)}` : "";
    return `<h1><span class="label">${headingLabel(item, language)}</span>${title}</h1>`;
  });
  return `<!doctype html><html lang="${language}"><head><meta charset="utf-8" /><style>${EBOOK_STYLE} body { margin: 24px; font-size: 15px; }</style></head><body>${body.join("\n")}</body></html>`;
}

export function EbookPreview({
  project,
  generalAuthor,
}: {
  project: Project;
  generalAuthor: string;
}) {
  const [page, setPage] = useState<string | null>(null);
  useEffect(() => {
    let isCurrent = true;
    void ebookPage(project, generalAuthor).then((html) => isCurrent && setPage(html));
    return () => void (isCurrent = false);
  }, [project, generalAuthor]);
  return (
    <div className="print-preview">
      <span className="setting-hint">{t("Förhandsvisning · E-bok")}</span>
      {page && <iframe className="ebook-screen" title={t("E-bok")} sandbox="" srcDoc={page} />}
    </div>
  );
}
