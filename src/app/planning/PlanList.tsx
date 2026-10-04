import type { CardActions } from "./cardActions.js";
import type { usePlanning } from "./usePlanning.js";

/** The words of a list tab: "händelse", "händelser", "Ny händelse". */
export interface ListWords {
  heading: string;
  one: string;
  many: string;
  add: string;
  empty: string;
  /** Said under the heading after the count, e.g. "i den ordning de står i strukturen". */
  order: string;
}

interface PlanListProps {
  entries: { id: string; title: string }[];
  words: ListWords;
  isNumbered: boolean;
  planning: ReturnType<typeof usePlanning>;
  cards: CardActions;
  onAdd: () => void;
}

function EmptyList({ words, onAdd }: Pick<PlanListProps, "words" | "onAdd">) {
  return (
    <div className="empty-state">
      <p className="empty-title">Inga {words.many} än</p>
      <p className="empty-text">{words.empty}</p>
      <button className="button primary" onClick={onAdd}>
        {words.add}
      </button>
    </div>
  );
}

/** Tidslinje and Anteckningar: texts in their folder, listed as the tree orders them. */
export function PlanList(props: PlanListProps) {
  const { entries, words } = props;
  if (entries.length === 0) return <EmptyList words={words} onAdd={props.onAdd} />;
  const noun = entries.length === 1 ? words.one : words.many;
  return (
    <>
      <div className="plan-heading">
        <h1>{words.heading}</h1>
        <span className="kpi-sub">{`${entries.length} ${noun} · ${words.order}`}</span>
      </div>
      <ol className="plan-list">
        {entries.map((entry, index) => (
          <li key={entry.id}>
            <button className="plan-row" onClick={() => props.cards.open(entry.id)}>
              {props.isNumbered && <span className="plan-number">{index + 1}</span>}
              <span className="plan-row-text">
                <span className="entity-name">{entry.title || "Namnlös"}</span>
                <span className="entity-note">{props.planning.excerptOf(entry.id)}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </>
  );
}
