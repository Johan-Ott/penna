import { shelfGroups, type ShelfBook } from "../../project/shelf.js";
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
  /** The phone's shelf: a round plus instead of the new-project book, as the mobile design. */
  isPhone?: boolean;
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

function NewBook({ onNewProject }: Pick<BookshelfProps, "onNewProject">) {
  return (
    <div className="book">
      <button className="book-cover new-book" onClick={onNewProject}>
        {t("+ Nytt projekt")}
      </button>
      <div className="shelf-board" />
    </div>
  );
}

// Books on their own in the first row, then a row per series under its name.
function ShelfRows(props: BookshelfProps & { books: ShelfBook[] }) {
  const groups = shelfGroups(props.books);
  return groups.map((group, groupIndex) => (
    <section key={group.series ?? ""} className="shelf-group">
      {group.series && <h2 className="shelf-series">{group.series}</h2>}
      <div className="books">
        {group.books.map((book) => (
          <Book key={book.dir} book={book} index={props.books.indexOf(book)} {...props} />
        ))}
        {groupIndex === groups.length - 1 && !props.isPhone && <NewBook {...props} />}
      </div>
    </section>
  ));
}

/** "Din bokhylla": every project as a book, with its status and when it was last written in. */
export function Bookshelf(props: BookshelfProps) {
  const books = useShelf(props.libraryDir, props.knownProjects);
  return (
    <div className="shelf-screen">
      <main className="shelf">
        <div className="shelf-heading">
          <h1>{props.isPhone ? t("Bokhylla") : t("Din bokhylla")}</h1>
          {props.isPhone ? (
            <button
              className="round-add"
              aria-label={t("Nytt projekt")}
              onClick={props.onNewProject}
            >
              +
            </button>
          ) : (
            books && <span className="shelf-summary">{summary(books)}</span>
          )}
        </div>
        {books?.length === 0 && <EmptyShelf {...props} />}
        {books && books.length > 0 && <ShelfRows books={books} {...props} />}
      </main>
    </div>
  );
}
