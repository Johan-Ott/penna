import type { ContentsRow } from "../../project/contents.js";
import { t } from "../../i18n/i18n.js";

// Rows without the person, place or label asked for fade, so the rest of the book stays in view.
function ContentsFilter(props: { query: string; onQuery: (query: string) => void }) {
  return (
    <label className="contents-filter">
      <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        aria-label={t("Filtrera")}
        placeholder={t("Visa var en person, plats eller label finns")}
        value={props.query}
        onChange={(event) => props.onQuery(event.target.value)}
      />
      {props.query && (
        <button
          className="icon-button"
          aria-label={t("Rensa filtret")}
          onClick={() => props.onQuery("")}
        >
          ×
        </button>
      )}
    </label>
  );
}

const MOST_CHIPS = 4;

/** The people whose eyes the chapters are seen through, as quick filters. */
function PovChips(props: { rows: ContentsRow[]; query: string; onQuery: (query: string) => void }) {
  const names = [...new Set(props.rows.map((row) => row.pov.trim()).filter(Boolean))];
  return names.slice(0, MOST_CHIPS).map((name) => {
    const isOn = props.query === name;
    return (
      <button
        key={name}
        className="contents-chip"
        aria-pressed={isOn}
        onClick={() => props.onQuery(isOn ? "" : name)}
      >
        {isOn ? `${name} ×` : name}
      </button>
    );
  });
}

function OrderSwitch(props: { isTimeOrder: boolean; onChange: (isTimeOrder: boolean) => void }) {
  const option = (label: string, isTimeOrder: boolean) => (
    <button
      role="radio"
      aria-checked={props.isTimeOrder === isTimeOrder}
      onClick={() => props.onChange(isTimeOrder)}
    >
      {label}
    </button>
  );
  return (
    <div className="segmented small" role="radiogroup" aria-label={t("Ordning")}>
      {option(t("Läsordning"), false)}
      {option(t("Tidsordning"), true)}
    </div>
  );
}

/** Above the chapters: the filter with its quick choices, and reading or time order. */
export function ContentsBar(props: {
  rows: ContentsRow[];
  query: string;
  onQuery: (query: string) => void;
  isTimeOrder: boolean;
  onTimeOrder: (isTimeOrder: boolean) => void;
}) {
  return (
    <div className="contents-bar">
      <span className="contents-bar-filter">
        <ContentsFilter query={props.query} onQuery={props.onQuery} />
        <PovChips rows={props.rows} query={props.query} onQuery={props.onQuery} />
      </span>
      <OrderSwitch isTimeOrder={props.isTimeOrder} onChange={props.onTimeOrder} />
    </div>
  );
}
