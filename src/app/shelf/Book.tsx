import { whenUpdated, type ShelfBook } from "../../project/shelf.js";
import { t, numberLocale } from "../../i18n/i18n.js";

// The covers of the design, in turn: black, light grey, dark grey and white.
const COVERS = ["cover-black", "cover-light", "cover-dark", "cover-white"];

interface BookProps {
  book: ShelfBook;
  index: number;
  onOpen: (dir: string) => void;
  onLocate: (book: ShelfBook) => void;
  onForget: (book: ShelfBook) => void;
}

function Cover({ book, index, onOpen }: Pick<BookProps, "book" | "index" | "onOpen">) {
  return (
    <button
      className={`book-cover ${COVERS[index % COVERS.length] ?? ""}`}
      onClick={() => onOpen(book.dir)}
    >
      <span className="book-kind">{book.kind}</span>
      <span className="book-title">{book.title}</span>
      <span className="book-words">
        {t("{count} ord", { count: book.words.toLocaleString(numberLocale()) })}
      </span>
    </button>
  );
}

function BookMeta({ book }: { book: ShelfBook }) {
  return (
    <div className="book-meta">
      <div className="book-status">
        <span>{book.status}</span>
        <span className="book-percent">{book.progress}%</span>
      </div>
      <div
        className="progress-bar"
        role="progressbar"
        aria-valuenow={book.progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t("{title}: {progress} procent klart", {
          title: book.title,
          progress: book.progress,
        })}
      >
        <div style={{ width: `${book.progress}%` }} />
      </div>
      <span className="book-updated">
        {book.updatedAt ? whenUpdated(book.updatedAt, Date.now()) : ""}
      </span>
    </div>
  );
}

// A project whose folder is gone: the text is still where it was put, Penna only lost sight of it.
function MissingBook({
  book,
  onLocate,
  onForget,
}: Pick<BookProps, "book" | "onLocate" | "onForget">) {
  return (
    <div className="book">
      <div className="book-cover missing">
        <span className="book-title">{book.title}</span>
        <span className="book-words">{t("Hittas inte")}</span>
      </div>
      <div className="shelf-board" />
      <div className="book-meta">
        <span className="book-updated">
          {t("Mappen har flyttats eller döpts om. Texten finns kvar där du lade den.")}
        </span>
        <button className="link-button" onClick={() => onLocate(book)}>
          {t("Leta upp mappen")}
        </button>
        <button className="link-button quiet" onClick={() => onForget(book)}>
          {t("Ta bort från hyllan")}
        </button>
      </div>
    </div>
  );
}

export function Book(props: BookProps) {
  if (props.book.isMissing) return <MissingBook {...props} />;
  return (
    <div className="book">
      <Cover {...props} />
      <div className="shelf-board" />
      <BookMeta book={props.book} />
    </div>
  );
}
