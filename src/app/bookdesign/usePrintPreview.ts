import { useEffect, useState } from "react";
import { previewOutline } from "../../export/bookDesign.js";
import { TypstError } from "../../export/typstCompile.js";
import { typstSource } from "../../export/typstBook.js";
import { bookLanguage, quoteStyleFor } from "../../project/bookLanguage.js";
import { appTypst } from "../typstAssets.js";
import type { Project } from "../useProject.js";
import { bookMaterial, printInput } from "../exporting/bookMaterial.js";

// Waits for the writer to stop clicking before setting the pages again.
const SETTLE_MS = 300;

type Preview =
  { kind: "working" } | { kind: "ready"; svg: string } | { kind: "failed"; reason: string };

// The first chapter, set by the same Typst and template as the PDF, so the two look alike.
async function previewSvg(project: Project, generalAuthor: string) {
  const material = await bookMaterial(project, generalAuthor);
  const choices = {
    typography: quoteStyleFor(bookLanguage(project.fields)),
    hasTitlePage: false,
    hasCopyrightPage: false,
    hasContents: false,
  };
  const outline = previewOutline(material.outline);
  const input = printInput({ project, material: { ...material, outline }, choices, extras: {} });
  return appTypst.svg(typstSource(input));
}

/** The first pages of the printed book, set again whenever the project or its design changes. */
export function usePrintPreview(project: Project, generalAuthor: string): Preview {
  const [preview, setPreview] = useState<Preview>({ kind: "working" });
  useEffect(() => {
    let isCurrent = true;
    const timer = setTimeout(() => {
      previewSvg(project, generalAuthor)
        .then((svg) => isCurrent && setPreview({ kind: "ready", svg }))
        .catch((error: unknown) => {
          const reason = error instanceof TypstError ? error.message : "Boken kunde inte sättas.";
          if (isCurrent) setPreview({ kind: "failed", reason });
        });
    }, SETTLE_MS);
    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [project, generalAuthor]);
  return preview;
}
