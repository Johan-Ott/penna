import { countWords } from "../countWords.js";
import { differingExcerpts } from "../manuscript/compare.js";
import { splitSceneFile } from "../manuscript/sceneFile.js";
import type { ConflictChoice, DiskConflict } from "./sceneSession.js";

interface ConflictDialogProps {
  sceneTitle: string;
  conflict: DiskConflict;
  onChoose: (choice: ConflictChoice) => void;
}

function VersionCard(props: { label: string; body: string; excerpt: string; isChosen: boolean }) {
  return (
    <div className={props.isChosen ? "version-card chosen" : "version-card"}>
      <span className="version-label">{props.label}</span>
      <span className="version-meta">{countWords(props.body).toLocaleString("sv-SE")} ord</span>
      <span className="version-excerpt">{props.excerpt}</span>
    </div>
  );
}

function ConflictActions({ onChoose }: Pick<ConflictDialogProps, "onChoose">) {
  return (
    <div className="dialog-actions">
      <button className="button secondary" onClick={() => onChoose("theirs")}>
        Behåll den andra
      </button>
      <button className="button secondary" onClick={() => onChoose("both")}>
        Behåll båda
      </button>
      <button className="button primary" onClick={() => onChoose("mine")} autoFocus>
        Behåll den här datorns
      </button>
    </div>
  );
}

export function ConflictDialog({ sceneTitle, conflict, onChoose }: ConflictDialogProps) {
  const mine = splitSceneFile(conflict.editorText).body;
  const theirs = splitSceneFile(conflict.diskText).body;
  const excerpts = differingExcerpts(mine, theirs);
  return (
    <div className="dialog-backdrop">
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="conflict-title">
        <div className="dialog-heading">
          <span id="conflict-title" className="dialog-title">
            Två versioner av ”{sceneTitle}”
          </span>
          <span className="dialog-text">
            Scenen ändrades i en annan app eller på en annan enhet medan du skrev. Inget har
            raderats.
          </span>
        </div>
        <div className="version-grid">
          <VersionCard label="Den här datorn" body={mine} excerpt={excerpts.mine} isChosen />
          <VersionCard
            label="Den andra versionen"
            body={theirs}
            excerpt={excerpts.theirs}
            isChosen={false}
          />
        </div>
        <ConflictActions onChoose={onChoose} />
      </div>
    </div>
  );
}
