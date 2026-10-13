import { whenUpdated, type ShelfBook } from "../../project/shelf.js";
import { coverLookOf } from "../../project/shelfLook.js";
import { useMenuButton } from "../Menu.js";
import { platform } from "../platform.js";
import { t, formatNumber } from "../../i18n/i18n.js";
import { useShelfCover } from "./useShelfCover.js";

interface BookProps {
  book: ShelfBook;
  /** The writer's name from Inställningar, written on a cover without a picture. */
  author: string;
  onOpen: (dir: string) => void;
  onLocate: ((book: ShelfBook) => void) | null;
  onForget: (book: ShelfBook) => void;
  onRemove: (book: ShelfBook) => void;
}

// "Bok 2" for a numbered book in a series; the kind of book otherwise.
function seriesLine(book: ShelfBook) {
  return book.series && book.seriesNumber ? t("Bok {number}", { number: book.seriesNumber }) : null;
}

// CSS class names stay in plain letters.
const stageClass = (book: ShelfBook) =>
  book.stage ? `stage-${book.stage === "idé" ? "ide" : book.stage}` : "";

function Cover({ book, author, pictureUrl, onOpen }: CoverProps) {
  if (pictureUrl) {
    return (
      <button
        className={`book-cover with-picture ${stageClass(book)}`}
        aria-label={book.title}
        onClick={() => onOpen(book.dir)}
      >
        <img className="book-cover-picture" src={pictureUrl} alt="" />
      </button>
    );
  }
  return (
    <button
      className={`book-cover ${coverLookOf(book.dir)} ${stageClass(book)}`}
      onClick={() => onOpen(book.dir)}
    >
      <span className="book-kind">{seriesLine(book) ?? book.kind}</span>
      <span className="book-title">{book.title}</span>
      <span className="book-words">
        {author || t("{count} ord", { count: formatNumber(book.words) })}
      </span>
    </button>
  );
}

type CoverProps = Pick<BookProps, "book" | "author" | "onOpen"> & { pictureUrl: string | null };

function BookMenu({ book, onRemove, onChooseCover }: BookMenuProps) {
  const items = [
    { label: t("Välj omslag…"), onSelect: onChooseCover },
    ...(platform.showInFolder
      ? [{ label: t("Visa i mappen"), onSelect: () => void platform.showInFolder?.(book.dir) }]
      : []),
    ...(platform.removeBook
      ? [{ label: t("Ta bort boken…"), separatorBefore: true, onSelect: () => onRemove(book) }]
      : []),
  ];
  const menu = useMenuButton(t("Bokens meny"), items);
  if (items.length === 0) return null;
  return (
    <>
      <button className="book-menu" aria-label={t("Bokens meny")} onClick={menu.open}>
        ⋯
      </button>
      {menu.menu}
    </>
  );
}

function ProgressBar({ book }: { book: ShelfBook }) {
  return (
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
  );
}

type BookMenuProps = Pick<BookProps, "book" | "onRemove"> & { onChooseCover: () => void };

// A picture may carry no title, or one too small to read, so the name stands under it.
function BookName({ book }: { book: ShelfBook }) {
  const line = seriesLine(book);
  return (
    <div className="book-name">
      <span className="book-name-title">{book.title}</span>
      {line && <span className="book-name-series">{line}</span>}
    </div>
  );
}

function BookMeta(props: BookMenuProps & { hasPicture: boolean }) {
  const { book, onRemove, onChooseCover } = props;
  return (
    <div className="book-meta">
      {props.hasPicture && <BookName book={book} />}
      <div className="book-status">
        <span>{book.status}</span>
        <span className="book-percent">{book.progress}%</span>
        <span className="book-meta-words">
          {t("{count} ord", { count: formatNumber(book.words) })}
        </span>
      </div>
      <ProgressBar book={book} />
      <div className="book-foot">
        <span className="book-updated">
          {book.updatedAt ? whenUpdated(book.updatedAt, Date.now()) : ""}
        </span>
        <BookMenu book={book} onRemove={onRemove} onChooseCover={onChooseCover} />
      </div>
    </div>
  );
}

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
        {onLocate && (
          <button className="link-button" onClick={() => onLocate(book)}>
            {t("Leta upp mappen")}
          </button>
        )}
        <button className="link-button quiet" onClick={() => onForget(book)}>
          {t("Ta bort från hyllan")}
        </button>
      </div>
    </div>
  );
}

function PresentBook(props: BookProps) {
  const cover = useShelfCover(props.book.dir);
  return (
    <div className="book">
      <Cover {...props} pictureUrl={cover.url} />
      <div className="shelf-board" />
      <BookMeta
        book={props.book}
        hasPicture={cover.url !== null}
        onRemove={props.onRemove}
        onChooseCover={cover.choose}
      />
    </div>
  );
}

export function Book(props: BookProps) {
  if (props.book.isMissing) return <MissingBook {...props} />;
  return <PresentBook {...props} />;
}
