import { useState } from "react";
import { chapterLabel, type Card, type CardKind } from "../../project/cards.js";
import type { Project } from "../useProject.js";
import type { CardActions } from "./cardActions.js";
import { initials, mentionCount, mentionedChapters } from "./cardFormat.js";
import type { usePlanning } from "./usePlanning.js";

type Planning = ReturnType<typeof usePlanning>;
type PlanProps = { planning: Planning; project: Project; cards: CardActions };

// Tidslinje and Anteckningar in the design come later; for now notes go in Research.
const TABS: [CardKind, string][] = [
  ["person", "Karaktärer"],
  ["plats", "Platser"],
];

const WORDS: Record<CardKind, { one: string; many: string; add: string; heading: string }> = {
  person: { one: "karaktär", many: "karaktärer", add: "Ny karaktär", heading: "Karaktärer" },
  plats: { one: "plats", many: "platser", add: "Ny plats", heading: "Platser" },
};

function CardTile(props: PlanProps & { card: Card }) {
  const { card, planning } = props;
  const mentions = planning.mentions.get(card.id);
  const excerpt = planning.excerptOf(card.id);
  return (
    <button className="entity-card" onClick={() => props.cards.open(card.id)}>
      <span className="entity-head">
        <span className="entity-avatar">{initials(card.name)}</span>
        <span className="entity-name">{card.name}</span>
      </span>
      {excerpt && <span className="entity-note">{excerpt}</span>}
      <span className="entity-foot">
        <span>{chapterLabel(mentionedChapters(props.project, mentions))}</span>
        <span>{mentionCount(mentions?.count ?? 0)}</span>
      </span>
    </button>
  );
}

function EmptyKind({ kind, onAdd }: { kind: CardKind; onAdd: () => void }) {
  return (
    <div className="empty-state">
      <p className="empty-title">Inga {WORDS[kind].many} än</p>
      <p className="empty-text">Skriv om dem som i en scen. Penna känner igen namnet i texten.</p>
      <button className="button primary" onClick={onAdd}>
        {WORDS[kind].add}
      </button>
    </div>
  );
}

// "Sorterat efter förekomst": the most named first, then by name.
function byMentions(planning: Planning, kind: CardKind) {
  const count = (card: Card) => planning.mentions.get(card.id)?.count ?? 0;
  return planning.cards
    .filter((card) => card.kind === kind)
    .sort(
      (first, second) =>
        count(second) - count(first) || first.name.localeCompare(second.name, "sv"),
    );
}

function CardGrid(props: PlanProps & { kind: CardKind }) {
  const { kind } = props;
  const shown = byMentions(props.planning, kind);
  if (shown.length === 0) return <EmptyKind kind={kind} onAdd={() => props.cards.create(kind)} />;
  const noun = shown.length === 1 ? WORDS[kind].one : WORDS[kind].many;
  return (
    <>
      <div className="plan-heading">
        <h1>{WORDS[kind].heading}</h1>
        <span className="kpi-sub">{`${shown.length} ${noun} · sorterat efter förekomst`}</span>
      </div>
      <div className="entity-grid">
        {shown.map((card) => (
          <CardTile key={card.id} {...props} card={card} />
        ))}
      </div>
    </>
  );
}

function PlanHeader(props: { tab: CardKind; onTab: (tab: CardKind) => void; onAdd: () => void }) {
  return (
    <header className="toolbar">
      <div className="plan-tabs">
        <span className="toolbar-title">Planera</span>
        {TABS.map(([id, label]) => (
          <button
            key={id}
            className={id === props.tab ? "plan-tab chosen" : "plan-tab"}
            aria-current={id === props.tab}
            onClick={() => props.onTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <button className="button primary small" onClick={props.onAdd}>
        {WORDS[props.tab].add}
      </button>
    </header>
  );
}

/** Planera: an overview of the characters and places, which are written like scenes. */
export function PlanView(props: PlanProps) {
  const [tab, setTab] = useState<CardKind>("person");
  return (
    <main className="plan-view">
      <PlanHeader tab={tab} onTab={setTab} onAdd={() => props.cards.create(tab)} />
      <div className="plan-content">
        <CardGrid {...props} kind={tab} />
      </div>
    </main>
  );
}
