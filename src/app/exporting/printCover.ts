import { designOf } from "../../export/bookDesign.js";
import { typstFiles, typstSource } from "../../export/typstBook.js";
import { coverSource, printCoverOf } from "../../export/typstCover.js";
import { findCover } from "../../project/cover.js";
import { platform } from "../platform.js";
import { appTypst } from "../typstAssets.js";
import type { Project } from "../useProject.js";
import { printInput, type BookMaterial } from "./bookMaterial.js";
import type { ExportChoices } from "./useExport.js";
import type { BookExtras } from "../../export/bookParts.js";

/** The book is set first, so the spine is as thick as the pages it holds. */
export async function printCoverPdf(
  project: Project,
  material: BookMaterial,
  choices: ExportChoices,
  extras: BookExtras,
) {
  const input = printInput({ project, material, choices, extras });
  const { pages } = await appTypst.pageMarks(typstSource(input), typstFiles(input));
  const picture = await findCover(platform.fileSystem, project.dir);
  const path = picture ? `/omslag/${picture.fileName}` : null;
  const source = coverSource({
    ...printCoverOf(project.fields),
    trim: designOf(project.fields).trim,
    pages,
    title: material.book.title,
    author: material.book.author,
    frontPicture: path,
    isbn: String(project.fields["isbn"] ?? ""),
  });
  return appTypst.pdf(source, picture && path ? new Map([[path, picture.bytes]]) : new Map());
}
