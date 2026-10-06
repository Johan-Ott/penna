import {
  COVER_COLORS,
  printCoverOf,
  SPINE_TEXT_PAGES,
  spineWidth,
  type CoverPaper,
  type PrintCover,
} from "../../export/typstCover.js";
import { Choice } from "../controls.js";
import { usePageMap } from "../usePageMap.js";
import type { Project } from "../useProject.js";
import { numberLocale, t } from "../../i18n/i18n.js";

const PAPERS: [CoverPaper, string][] = [
  ["vitt", t("Vitt")],
  ["kramvitt", t("Krämvitt")],
];

type CoverProps = {
  project: Project;
  generalAuthor: string;
  onSaveFields: (fields: Record<string, unknown>) => void;
};

// The spine follows the book: counted as it is printed, then times the paper's thickness.
function SpineNote({ project, generalAuthor, cover }: CoverProps & { cover: PrintCover }) {
  const pages = usePageMap(project, generalAuthor, true)?.pages ?? null;
  if (pages === null) return <span className="setting-hint">{t("Räknar sidorna…")}</span>;
  const width = spineWidth(pages, cover.paper).toLocaleString(numberLocale());
  return (
    <span className="setting-hint">
      {t("Ryggen blir {width} mm vid {pages} sidor.", { width, pages })}{" "}
      {pages < SPINE_TEXT_PAGES &&
        t("Med färre än {count} sidor får ryggen ingen text.", { count: SPINE_TEXT_PAGES })}
    </span>
  );
}

function ColorChoice({
  cover,
  save,
}: {
  cover: PrintCover;
  save: (change: Partial<PrintCover>) => void;
}) {
  return (
    <div className="cover-colors" role="radiogroup" aria-label={t("Färg")}>
      {Object.entries(COVER_COLORS).map(([name, colors]) => (
        <button
          key={name}
          role="radio"
          aria-checked={cover.color === name}
          aria-label={name}
          className="cover-color"
          style={{ background: colors.background }}
          onClick={() => save({ color: name })}
        />
      ))}
    </div>
  );
}

function BackText({
  cover,
  save,
}: {
  cover: PrintCover;
  save: (change: Partial<PrintCover>) => void;
}) {
  return (
    <>
      <span className="export-heading">{t("Baksidestext")}</span>
      <textarea
        key={cover.backText}
        className="cover-back-text"
        rows={6}
        aria-label={t("Baksidestext")}
        defaultValue={cover.backText}
        onBlur={(event) =>
          event.target.value !== cover.backText && save({ backText: event.target.value })
        }
      />
      <span className="setting-hint">
        {t(
          "Framsidan är omslagsbilden under Bokuppgifter. Lämna baksidans nedre del fri: där sätter tryckeriet streckkoden.",
        )}
      </span>
    </>
  );
}

/** Back, spine and front for print: the paper, a colour, and the text on the back. */
export function CoverFields(props: CoverProps) {
  const cover = printCoverOf(props.project.fields);
  const save = (change: Partial<PrintCover>) =>
    props.onSaveFields({ printCover: { ...cover, ...change } });
  return (
    <>
      <span className="export-heading">{t("Papper")}</span>
      <Choice
        label={t("Papper")}
        value={cover.paper}
        options={PAPERS}
        onSelect={(paper) => save({ paper })}
      />
      <SpineNote {...props} cover={cover} />
      <span className="export-heading">{t("Färg")}</span>
      <ColorChoice cover={cover} save={save} />
      <BackText cover={cover} save={save} />
    </>
  );
}
