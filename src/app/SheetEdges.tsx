import { t } from "../i18n/i18n.js";

export interface SheetProps {
  /** The book's name and the chapter, at the head of the sheet. */
  runningHead?: { book: string; chapter: string } | undefined;
  /** "192 av cirka 320" at the foot of the sheet, once the pages are counted. */
  folio?: { page: number; total: number } | null | undefined;
}

function SheetHead({ runningHead }: SheetProps) {
  if (!runningHead) return null;
  return (
    <div className="sheet-head" aria-hidden="true">
      <span>{runningHead.book}</span>
      <span>{runningHead.chapter}</span>
    </div>
  );
}

function Folio({ folio }: SheetProps) {
  if (!folio) return null;
  return (
    <span className="sheet-folio">
      <span className="sheet-page">{folio.page}</span>
      {t("av cirka {count}", { count: folio.total })}
    </span>
  );
}

/** Only on paper does the text lie on a sheet with a head and a foot. */
export const SheetEdges = (props: SheetProps & { isShown: boolean }) =>
  props.isShown ? (
    <>
      <SheetHead {...props} />
      <Folio {...props} />
    </>
  ) : null;
