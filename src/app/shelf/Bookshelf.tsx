import { shelfGroups, type ShelfBook } from "../../project/shelf.js";
import { Book } from "./Book.js";
import { CloudBook } from "./CloudBook.js";
import { ContinueWriting } from "./ContinueWriting.js";
import type { CloudBook as InCloud, Fetching } from "./useCloudBooks.js";
import { useShelf } from "./useShelf.js";
import { t, formatNumber } from "../../i18n/i18n.js";

// Where every start leads: a new book, the writer's books and the ones in their Drive, and a
// manuscript or the example to begin from under them.

interface BookshelfProps {
  libraryDir: string | null;
  /** The writer's name, for the covers of books without a picture. */
  author: string;
  knownProjects: string[];
  onOpen: (dir: string) => void;
  onNewProject: () => void;
  onImport: () => void;
  onOpenExample: () => void;
  onLocate: ((book: ShelfBook) => void) | null;
  onForget: (book: ShelfBook) => void;
  onRemove: (book: ShelfBook) => void;
  /** Removes a book here and its copy in Drive; null when the writer is not signed in. */
  onRemoveEverywhere: ((book: ShelfBook) => void) | null;
  cloud: {
    books: InCloud[];
    fetching: Fetching | null;
    onFetch: (name: string) => void;
    remove: (book: InCloud) => void;
  };
}

function summary(books: ShelfBook[]) {
  const present = books.filter((book) => !book.isMissing);
  if (present.length === 0) return null;
  const words = present.reduce((sum, book) => sum + book.words, 0);
  const count = present.length;
  const sum = formatNumber(words);
  return count === 1
    ? t("1 bok · {words} ord", { words: sum })
    : t("{count} böcker · {words} ord totalt", { count, words: sum });
}

function NewBook({ onNewProject }: Pick<BookshelfProps, "onNewProject">) {
  return (
    <div className="book">
      <button className="book-cover new-book" onClick={onNewProject}>
        {t("+ Ny bok")}
      </button>
    </div>
  );
}

// The books in Drive lead the first row; an empty shelf has Ny bok there, as large as a book.
function Starts(props: BookshelfProps & { isEmpty: boolean }) {
  const { cloud } = props;
  return (
    <>
      {props.isEmpty && <NewBook {...props} />}
      {cloud.books.map((book) => (
        <CloudBook
          key={book.id}
          book={book}
          fetching={cloud.fetching}
          onFetch={() => cloud.onFetch(book.name)}
          onRemove={() => cloud.remove(book)}
        />
      ))}
    </>
  );
}

function ShelfRows(props: BookshelfProps & { books: ShelfBook[] }) {
  const groups = shelfGroups(props.books);
  const isEmpty = !props.books.some((book) => !book.isMissing);
  if (groups.length === 0)
    return (
      <div className="books">
        <Starts {...props} isEmpty />
      </div>
    );
  return groups.map((group, index) => (
    <section key={group.series ?? ""} className="shelf-group">
      {group.series && <h2 className="shelf-series">{group.series}</h2>}
      <div className="books">
        {index === 0 && <Starts {...props} isEmpty={isEmpty} />}
        {group.books.map((book) => (
          <Book key={book.dir} book={book} {...props} />
        ))}
      </div>
    </section>
  ));
}

// What the shelf holds, and the ways to a new book, in one quiet row above the books.
function ShelfHead(props: BookshelfProps & { books: ShelfBook[] | null }) {
  return (
    <div className="shelf-head">
      <h2>{t("Dina böcker")}</h2>
      <span className="shelf-summary">{props.books && summary(props.books)}</span>
      <button className="link-button quiet" onClick={props.onOpenExample}>
        {t("Prova exempelboken")}
      </button>
      <button className="link-button quiet" onClick={props.onImport}>
        {t("Importera manus…")}
      </button>
      {props.books?.some((book) => !book.isMissing) && (
        <button className="button primary small" onClick={props.onNewProject}>
          {t("+ Ny bok")}
        </button>
      )}
    </div>
  );
}

export function Bookshelf(props: BookshelfProps) {
  const books = useShelf(props.libraryDir, props.knownProjects);
  return (
    <div className="shelf-screen">
      <main className="shelf">
        {books && <ContinueWriting books={books} author={props.author} onOpen={props.onOpen} />}
        <ShelfHead {...props} books={books} />
        {books && <ShelfRows books={books} {...props} />}
      </main>
    </div>
  );
}
