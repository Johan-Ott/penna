import { useState } from "react";
import { chapterLabel, type Card, type CardKind } from "../../project/cards.js";
import { CHARACTERS_ID, NOTES_ID, PLACES_ID, TIMELINE_ID } from "../../project/tree.js";
import type { Project } from "../useProject.js";
import type { CardActions } from "./cardActions.js";
import { initials, mentionCount, mentionedChapters } from "./cardFormat.js";
import { PlanList, type ListWords } from "./PlanList.js";
import type { usePlanning } from "./usePlanning.js";

type Planning = ReturnType<typeof usePlanning>;
type PlanProps = { planning: Planning; project: Project; cards: CardActions };

type PlanTab = CardKind | "tidslinje" | "anteckningar";

// Each tab is a fixed folder in the tree; its texts are written like scenes.
const TABS: { id: PlanTab; label: string; folder: string; add: string }[] = [
  { id: "person", label: "Karaktärer", folder: CHARACTERS_ID, add: "Ny karaktär" },
  { id: "plats", label: "Platser", folder: PLACES_ID, add: "Ny plats" },
  { id: "tidslinje", label: "Tidslinje", folder: TIMELINE_ID, add: "Ny händelse" },
  { id: "anteckningar", label: "Anteckningar", folder: NOTES_ID, add: "Ny anteckning" },
];

const folderOf = (tab: PlanTab) => TABS.find((each) => each.id === tab)?.folder ?? NOTES_ID;

const TIMELINE_WORDS: ListWords = {
  heading: "Tidslinje",
  one: "händelse",
  many: "händelser",
  add: "Ny händelse",
  empty: "En händelse per text. Dra dem i strukturen för att ändra ordningen.",
  order: "i den ordning de står i strukturen",
};

const NOTES_WORDS: ListWords = {
  heading: "Anteckningar",
  one: "anteckning",
  many: "anteckningar",
  add: "Ny anteckning",
  empty: "Idéer, frågor och sånt som inte hör till en scen.",
  order: "i strukturens ordning",
};

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
  if (shown.length === 0)
    return <EmptyKind kind={kind} onAdd={() => props.cards.create(folderOf(kind))} />;
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

function PlanHeader(props: { tab: PlanTab; onTab: (tab: PlanTab) => void; onAdd: () => void }) {
  return (
    <header className="toolbar">
      <div className="plan-tabs">
        <span className="toolbar-title">Planera</span>
        {TABS.map(({ id, label }) => (
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
        {TABS.find((each) => each.id === props.tab)?.add}
      </button>
    </header>
  );
}

function PlanContent(props: PlanProps & { tab: PlanTab }) {
  const { tab, planning } = props;
  const onAdd = () => props.cards.create(folderOf(tab));
  if (tab === "person" || tab === "plats") return <CardGrid {...props} kind={tab} />;
  const isTimeline = tab === "tidslinje";
  return (
    <PlanList
      {...props}
      entries={isTimeline ? planning.timeline : planning.notes}
      words={isTimeline ? TIMELINE_WORDS : NOTES_WORDS}
      isNumbered={isTimeline}
      onAdd={onAdd}
    />
  );
}

/** Planera: characters, places, the timeline and notes, all written like scenes. */
export function PlanView(props: PlanProps) {
  const [tab, setTab] = useState<PlanTab>("person");
  return (
    <main className="plan-view">
      <PlanHeader tab={tab} onTab={setTab} onAdd={() => props.cards.create(folderOf(tab))} />
      <div className="plan-content">
        <PlanContent {...props} tab={tab} />
      </div>
    </main>
  );
}
