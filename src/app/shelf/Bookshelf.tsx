import type { ShelfBook } from "../../project/shelf.js";
import { Book } from "./Book.js";
import { useShelf } from "./useShelf.js";
import { t, numberLocale } from "../../i18n/i18n.js";

interface BookshelfProps {
  libraryDir: string | null;
  knownProjects: string[];
  onOpen: (dir: string) => void;
  onNewProject: () => void;
  onOpenFolder: () => void;
  onOpenExample: () => void;
  onLocate: (book: ShelfBook) => void;
  onForget: (book: ShelfBook) => void;
}

function EmptyShelf(
  props: Pick<BookshelfProps, "onNewProject" | "onOpenFolder" | "onOpenExample">,
) {
  return (
    <div className="empty-state">
      <p className="empty-title">{t("Tom bokhylla")}</p>
      <p className="empty-text">
        {t("Skapa ditt första projekt eller öppna en mapp du redan har.")}
      </p>
      <div className="welcome-actions">
        <button className="button primary" onClick={props.onNewProject}>
          {t("Nytt projekt")}
        </button>
        <button className="button secondary" onClick={props.onOpenFolder}>
          {t("Öppna mapp…")}
        </button>
      </div>
      <button className="link-button quiet" onClick={props.onOpenExample}>
        {t("Öppna exempelprojektet")}
      </button>
    </div>
  );
}

function summary(books: ShelfBook[]) {
  const present = books.filter((book) => !book.isMissing);
  if (present.length === 0) return null;
  const words = present.reduce((sum, book) => sum + book.words, 0);
  return t("{count} projekt · {words} ord totalt", {
    count: present.length,
    words: words.toLocaleString(numberLocale()),
  });
}

/** "Din bokhylla": every project as a book, with its status and when it was last written in. */
export function Bookshelf(props: BookshelfProps) {
  const books = useShelf(props.libraryDir, props.knownProjects);
  return (
    <div className="shelf-screen">
      <main className="shelf">
        <div className="shelf-heading">
          <h1>{t("Din bokhylla")}</h1>
          {books && <span className="shelf-summary">{summary(books)}</span>}
        </div>
        {books?.length === 0 && <EmptyShelf {...props} />}
        {books && books.length > 0 && (
          <div className="books">
            {books.map((book, index) => (
              <Book key={book.dir} book={book} index={index} {...props} />
            ))}
            <div className="book">
              <button className="book-cover new-book" onClick={props.onNewProject}>
                {t("+ Nytt projekt")}
              </button>
              <div className="shelf-board" />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
