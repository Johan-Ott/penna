import { useState } from "react";
import { Dialog } from "../controls.js";
import { useMenuButton } from "../Menu.js";
import type { CloudBook as Book, Fetching } from "./useCloudBooks.js";
import { t } from "../../i18n/i18n.js";

// A book in the writer's Drive that this device has not fetched: pale, fetched and opened by a
// tap, and removed from Drive from its menu, into Drive's trash for 30 days.

const fetchText = ({ done, all }: Fetching) =>
  all === 0 ? t("Hämtar…") : t("Hämtar {done} av {all}", { done, all });

const title = (book: Book) => book.name.replace(/\.penna$/, "");

function RemoveDialog(props: { book: Book; onRemove: () => void; onClose: () => void }) {
  return (
    <Dialog label={t("Ta bort från Drive")} onClose={props.onClose}>
      <p className="setting-hint">
        {t("”{title}” flyttas till papperskorgen i din Drive, där den finns kvar i 30 dagar.", {
          title: title(props.book),
        })}
      </p>
      <div className="dialog-actions">
        <button className="button ghost" onClick={props.onClose}>
          {t("Avbryt")}
        </button>
        <button className="button primary" onClick={() => (props.onRemove(), props.onClose())}>
          {t("Ta bort")}
        </button>
      </div>
    </Dialog>
  );
}

function CloudMenu(props: { book: Book; onRemove: () => void }) {
  const [isAsking, setAsking] = useState(false);
  const menu = useMenuButton(t("Bokens meny"), [
    { label: t("Ta bort från Drive…"), onSelect: () => setAsking(true) },
  ]);
  return (
    <>
      <button className="book-menu" aria-label={t("Bokens meny")} onClick={menu.open}>
        ⋯
      </button>
      {menu.menu}
      {isAsking && (
        <RemoveDialog
          book={props.book}
          onRemove={props.onRemove}
          onClose={() => setAsking(false)}
        />
      )}
    </>
  );
}

export function CloudBook(props: {
  book: Book;
  fetching: Fetching | null;
  onFetch: () => void;
  onRemove: () => void;
}) {
  const isThis = props.fetching?.name === props.book.name;
  return (
    <div className="book">
      <button
        className="book-cover in-cloud"
        disabled={props.fetching !== null}
        onClick={props.onFetch}
      >
        <span className="book-kind">{t("I din Drive")}</span>
        <span className="book-title">{title(props.book)}</span>
        <span className="book-words">
          {isThis && props.fetching ? fetchText(props.fetching) : t("Tryck för att hämta")}
        </span>
      </button>
      <div className="shelf-board" />
      <div className="book-meta">
        <div className="book-foot">
          <span className="book-updated">{t("Inte hämtad hit")}</span>
          <CloudMenu book={props.book} onRemove={props.onRemove} />
        </div>
      </div>
    </div>
  );
}
