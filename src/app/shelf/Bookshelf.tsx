import type { ShelfBook } from "../../project/shelf.js";
import { Book } from "./Book.js";
import { useShelf } from "./useShelf.js";

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

function ShelfHeader({
  onNewProject,
  onOpenFolder,
}: Pick<BookshelfProps, "onNewProject" | "onOpenFolder">) {
  return (
    <header className="shelf-header">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          P
        </span>
        <span className="brand-name">Penna</span>
      </div>
      <div className="shelf-actions">
        <button className="button secondary small" onClick={onOpenFolder}>
          Öppna mapp…
        </button>
        <button className="button primary small" onClick={onNewProject}>
          Nytt projekt
        </button>
      </div>
    </header>
  );
}

function EmptyShelf(
  props: Pick<BookshelfProps, "onNewProject" | "onOpenFolder" | "onOpenExample">,
) {
  return (
    <div className="empty-state">
      <p className="empty-title">Tom bokhylla</p>
      <p className="empty-text">Skapa ditt första projekt eller öppna en mapp du redan har.</p>
      <div className="welcome-actions">
        <button className="button primary" onClick={props.onNewProject}>
          Nytt projekt
        </button>
        <button className="button secondary" onClick={props.onOpenFolder}>
          Öppna mapp…
        </button>
      </div>
      <button className="link-button quiet" onClick={props.onOpenExample}>
        Öppna exempelprojektet
      </button>
    </div>
  );
}

function summary(books: ShelfBook[]) {
  const present = books.filter((book) => !book.isMissing);
  if (present.length === 0) return null;
  const words = present.reduce((sum, book) => sum + book.words, 0);
  return `${present.length} projekt · ${words.toLocaleString("sv-SE")} ord totalt`;
}

/** "Din bokhylla": every project as a book, with its status and when it was last written in. */
export function Bookshelf(props: BookshelfProps) {
  const books = useShelf(props.libraryDir, props.knownProjects);
  return (
    <div className="shelf-screen">
      <ShelfHeader {...props} />
      <main className="shelf">
        <div className="shelf-heading">
          <h1>Din bokhylla</h1>
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
                + Nytt projekt
              </button>
              <div className="shelf-board" />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
