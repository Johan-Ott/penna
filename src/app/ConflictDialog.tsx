import { countWords } from "../countWords.js";
import { differingExcerpts, plainText } from "../manuscript/compare.js";
import { splitSceneFile } from "../manuscript/sceneFile.js";
import type { ConflictChoice, DiskConflict } from "./sceneSession.js";
import { t, numberLocale } from "../i18n/i18n.js";

interface ConflictDialogProps {
  sceneTitle: string;
  conflict: DiskConflict;
  onChoose: (choice: ConflictChoice) => void;
  /** Who made the other version, when that is known, for example "Elins iPhone". */
  otherLabel?: string | undefined;
  text?: string;
  /** A sync copy can wait; a conflict in the open scene cannot, so it has no "Senare". */
  onLater?: (() => void) | undefined;
}

const EDITED_ELSEWHERE = t(
  t("Scenen ändrades i en annan app eller på en annan enhet medan du skrev. Inget har raderats."),
);

function VersionCard(props: { label: string; body: string; excerpt: string; isChosen: boolean }) {
  return (
    <div className={props.isChosen ? "version-card chosen" : "version-card"}>
      <span className="version-label">{props.label}</span>
      <span className="version-meta">
        {t("{count} ord", { count: countWords(props.body).toLocaleString(numberLocale()) })}
      </span>
      <span className="version-excerpt">{props.excerpt}</span>
    </div>
  );
}

function ConflictActions({ onChoose, onLater }: Pick<ConflictDialogProps, "onChoose" | "onLater">) {
  return (
    <div className="dialog-actions">
      {onLater && (
        <button className="link-button quiet push-left" onClick={onLater}>
          {t("Senare")}
        </button>
      )}
      <button className="button secondary" onClick={() => onChoose("theirs")}>
        {t("Behåll den andra")}
      </button>
      <button className="button secondary" onClick={() => onChoose("both")}>
        {t("Behåll båda")}
      </button>
      <button className="button primary" onClick={() => onChoose("mine")} autoFocus>
        {t("Behåll den här enhetens")}
      </button>
    </div>
  );
}

export function ConflictDialog(props: ConflictDialogProps) {
  const { sceneTitle, conflict, onChoose } = props;
  const mine = splitSceneFile(conflict.editorText).body;
  const theirs = splitSceneFile(conflict.diskText).body;
  const excerpts = differingExcerpts(plainText(mine), plainText(theirs));
  return (
    <div className="dialog-backdrop">
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="conflict-title">
        <div className="dialog-heading">
          <span id="conflict-title" className="dialog-title">
            {t("Två versioner av ”{title}”", { title: sceneTitle })}
          </span>
          <span className="dialog-text">{props.text ?? EDITED_ELSEWHERE}</span>
        </div>
        <div className="version-grid">
          <VersionCard label={t("Den här enheten")} body={mine} excerpt={excerpts.mine} isChosen />
          <VersionCard
            label={props.otherLabel ?? t("Den andra versionen")}
            body={theirs}
            excerpt={excerpts.theirs}
            isChosen={false}
          />
        </div>
        <ConflictActions onChoose={onChoose} onLater={props.onLater} />
      </div>
    </div>
  );
}
