import { shelfGroups, type ShelfBook } from "../../project/shelf.js";
import { Book } from "./Book.js";
import type { Fetching } from "./useCloudBooks.js";
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
  cloud: { names: string[]; fetching: Fetching | null; onFetch: (name: string) => void };
}

function summary(books: ShelfBook[]) {
  const present = books.filter((book) => !book.isMissing);
  if (present.length === 0) return null;
  const words = present.reduce((sum, book) => sum + book.words, 0);
  return t("{count} böcker · {words} ord totalt", {
    count: present.length,
    words: formatNumber(words),
  });
}

function NewBook({ onNewProject }: Pick<BookshelfProps, "onNewProject">) {
  return (
    <div className="book">
      <button className="book-cover new-book" onClick={onNewProject}>
        {t("+ Ny bok")}
      </button>
      <div className="shelf-board" />
    </div>
  );
}

const fetchText = ({ done, all }: Fetching) =>
  all === 0 ? t("Hämtar…") : t("Hämtar {done} av {all}", { done, all });

// A book in Drive, pale with a cloud, fetched and opened by a tap.
function CloudBook(props: { name: string; fetching: Fetching | null; onFetch: () => void }) {
  const isThis = props.fetching?.name === props.name;
  return (
    <div className="book">
      <button
        className="book-cover in-cloud"
        disabled={props.fetching !== null}
        onClick={props.onFetch}
      >
        <span className="book-kind">{t("I din Drive")}</span>
        <span className="book-title">{props.name.replace(/\.penna$/, "")}</span>
        <span className="book-words">
          {isThis && props.fetching ? fetchText(props.fetching) : t("Tryck för att hämta")}
        </span>
      </button>
      <div className="shelf-board" />
    </div>
  );
}

// Ny bok and the books in Drive lead the first row, so a new writer's shelf is one row.
function Starts(props: BookshelfProps) {
  const { cloud } = props;
  return (
    <>
      <NewBook {...props} />
      {cloud.names.map((name) => (
        <CloudBook
          key={name}
          name={name}
          fetching={cloud.fetching}
          onFetch={() => cloud.onFetch(name)}
        />
      ))}
    </>
  );
}

function ShelfRows(props: BookshelfProps & { books: ShelfBook[] }) {
  const groups = shelfGroups(props.books);
  if (groups.length === 0)
    return (
      <div className="books">
        <Starts {...props} />
      </div>
    );
  return groups.map((group, index) => (
    <section key={group.series ?? ""} className="shelf-group">
      {group.series && <h2 className="shelf-series">{group.series}</h2>}
      <div className="books">
        {index === 0 && <Starts {...props} />}
        {group.books.map((book) => (
          <Book key={book.dir} book={book} {...props} />
        ))}
      </div>
    </section>
  ));
}

export function Bookshelf(props: BookshelfProps) {
  const books = useShelf(props.libraryDir, props.knownProjects);
  return (
    <div className="shelf-screen">
      <main className="shelf">
        <div className="shelf-heading">
          <h1>{t("Bokhylla")}</h1>
          {books && <span className="shelf-summary">{summary(books)}</span>}
        </div>
        {books && <ShelfRows books={books} {...props} />}
        <div className="shelf-starts">
          <button className="link-button quiet" onClick={props.onImport}>
            {t("Importera manus…")}
          </button>
          <button className="link-button quiet" onClick={props.onOpenExample}>
            {t("Prova exempelboken")}
          </button>
        </div>
      </main>
    </div>
  );
}
