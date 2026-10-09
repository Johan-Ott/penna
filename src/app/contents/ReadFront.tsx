import { bookDetails } from "../../export/book.js";
import { designOf } from "../../export/bookDesign.js";
import { bookWords } from "../../export/bookWords.js";
import { bookLanguage } from "../../project/bookLanguage.js";
import type { Project } from "../useProject.js";
import { t } from "../../i18n/i18n.js";

/** The title page and its back, before page 1: a printed book counts them apart. */
export const FRONT_PAGES = 2;

/** The book opens on its title page and imprint, filled in from the book's details in Publicera. */
export function ReadFront({ project, author }: { project: Project; author: string }) {
  const book = bookDetails(project.fields, author, 0);
  const title = book.title || project.name;
  const isbn = String(project.fields["isbn"] ?? "");
  return (
    <>
      <section className="read-front read-title-page">
        {book.author && <span className="read-title-author">{book.author}</span>}
        <h1 className="read-title">{title}</h1>
        {book.subtitle && <span className="read-title-kind">{book.subtitle}</span>}
      </section>
      <section className="read-front read-imprint">
        <p>{title}</p>
        <p>
          © {new Date().getFullYear()} {book.author || title}
        </p>
        <p>{bookWords(bookLanguage(project.fields)).rights}</p>
        <p>{t("Satt med {font}", { font: designOf(project.fields).bodyFont })}</p>
        {isbn && <p>ISBN {isbn}</p>}
      </section>
    </>
  );
}
