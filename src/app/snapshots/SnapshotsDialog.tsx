import type { Node } from "prosemirror-model";
import { useEffect, useRef, useState } from "react";
import { countDocumentWords } from "../../manuscript/wordCount.js";
import { plainText } from "../../manuscript/compare.js";
import { diffWords } from "../../manuscript/wordDiff.js";
import { snapshotWhen, type Snapshot } from "../../project/snapshots.js";
import { useEscape } from "../useShortcut.js";
import type { useSnapshots } from "./useSnapshots.js";
import { t, numberLocale } from "../../i18n/i18n.js";

type SnapshotState = ReturnType<typeof useSnapshots>;

interface SnapshotsDialogProps {
  state: SnapshotState;
  sceneTitle: string;
  /** Blocks separated by blank lines. */
  nowText: string;
  nowWords: number;
}

const formatWords = (words: number) =>
  t("{count} ord", { count: words.toLocaleString(numberLocale()) });

function itemLabels(snapshot: Snapshot, now: number) {
  const when = snapshotWhen(snapshot.time, now);
  if (!snapshot.isManual)
    return { title: when, meta: `Automatisk · ${formatWords(snapshot.words)}` };
  return {
    title: snapshot.label ?? when,
    meta: `Manuell · ${snapshot.label ? when.toLowerCase() : formatWords(snapshot.words)}`,
  };
}

function TakeSnapshot({ onTake }: { onTake: (label: string) => void }) {
  const [label, setLabel] = useState("");
  const take = () => {
    onTake(label);
    setLabel("");
  };
  return (
    <div className="snapshot-take">
      <input
        aria-label={t("Namn på versionen")}
        placeholder={t("Namn, t.ex. Före omskrivning")}
        value={label}
        onChange={(event) => setLabel(event.target.value)}
        onKeyDown={(event) => event.key === "Enter" && take()}
      />
      <button className="button secondary small" onClick={take}>
        {t("Spara version")}
      </button>
    </div>
  );
}

function SnapshotList({ state, nowWords }: Pick<SnapshotsDialogProps, "state" | "nowWords">) {
  const now = Date.now();
  const item = (key: string, title: string, meta: string) => (
    <button
      key={key}
      className={state.chosen === key ? "snapshot-item chosen" : "snapshot-item"}
      aria-pressed={state.chosen === key}
      onClick={() => state.choose(key)}
    >
      <span className="snapshot-title">{title}</span>
      <span className="snapshot-meta">{meta}</span>
    </button>
  );
  return (
    <div className="snapshot-list">
      {item("now", t("Nu"), formatWords(nowWords))}
      {state.snapshots.map((snapshot) => {
        const { title, meta } = itemLabels(snapshot, now);
        return item(snapshot.fileName, title, meta);
      })}
      {state.snapshots.length === 0 && (
        <p className="snapshot-empty">
          {t("Inga versioner än. Penna sparar en själv när du skriver om en större del av texten.")}
        </p>
      )}
      <TakeSnapshot onTake={state.take} />
    </div>
  );
}

function Comparison({ state, nowText }: Pick<SnapshotsDialogProps, "state" | "nowText">) {
  const textRef = useRef<HTMLDivElement>(null);
  // In a long scene the first change could be out of sight.
  useEffect(() => {
    textRef.current?.querySelector("del, ins")?.scrollIntoView({ block: "center" });
  }, [state.chosen]);
  const snapshot = state.snapshots.find((candidate) => candidate.fileName === state.chosen);
  if (!snapshot) return <div className="snapshot-text">{nowText}</div>;
  const parts = diffWords(plainText(snapshot.body, "\n\n"), nowText);
  return (
    <>
      <div className="snapshot-text" ref={textRef}>
        {parts.map((part, index) => {
          if (part.kind === "removed") return <del key={index}>{part.text}</del>;
          if (part.kind === "added") return <ins key={index}>{part.text}</ins>;
          return <span key={index}>{part.text}</span>;
        })}
      </div>
      <button className="button primary small restore" onClick={() => state.restore(snapshot)}>
        {t("Återställ den här versionen")}
      </button>
    </>
  );
}

function SnapshotsDialog(props: SnapshotsDialogProps) {
  const { state } = props;
  useEscape(state.close);
  return (
    <div className="dialog-backdrop" onClick={state.close}>
      <div
        className="dialog snapshots-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="snapshots-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dialog-heading row">
          <span id="snapshots-title" className="dialog-title">
            {t("Versioner av ”{title}”", { title: props.sceneTitle })}
          </span>
          <button className="link-button quiet" onClick={state.close}>
            {t("Stäng")}
          </button>
        </div>
        <div className="snapshots">
          <SnapshotList {...props} />
          <div className="snapshot-view">
            <Comparison {...props} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SnapshotsLayer(props: {
  state: SnapshotState;
  sceneTitle: string;
  doc: Node | null;
}) {
  const { state, doc } = props;
  if (!state.sceneId || !doc) return null;
  return (
    <SnapshotsDialog
      state={state}
      sceneTitle={props.sceneTitle}
      nowText={doc.textBetween(0, doc.content.size, "\n\n")}
      nowWords={countDocumentWords(doc)}
    />
  );
}
