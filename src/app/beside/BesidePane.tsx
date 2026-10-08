import type { Node } from "prosemirror-model";
import { useEffect, useState } from "react";
import { plainText } from "../../manuscript/compare.js";
import { parseMarkdown } from "../../manuscript/parseMarkdown.js";
import { splitSceneFile } from "../../manuscript/sceneFile.js";
import { snapshotWhen, type Snapshot } from "../../project/snapshots.js";
import { joinPath } from "../../storage/fileSystem.js";
import type { AppState } from "../App.js";
import { SceneText } from "../contents/sceneDocs.js";
import { platform } from "../platform.js";
import { DiffText } from "../snapshots/SnapshotsDialog.js";
import type { Project } from "../useProject.js";
import { t } from "../../i18n/i18n.js";

/** What shows beside the text: another text to read, or a version of the open one to compare. */
export type Beside =
  | { kind: "text"; dir: string; sceneId: string }
  | { kind: "version"; dir: string; sceneId: string; snapshot: Snapshot };

export function useBeside() {
  const [beside, setBeside] = useState<Beside | null>(null);
  return { beside, setBeside };
}

// Read again when the project is, so a text saved elsewhere shows as it is now.
function useBesideDoc(beside: Beside | null, project: Project) {
  const [doc, setDoc] = useState<Node | null>(null);
  const path = beside ? joinPath(beside.dir, `scenes/${beside.sceneId}.md`) : null;
  useEffect(() => {
    setDoc(null);
    if (!path) return;
    let isCurrent = true;
    void platform.fileSystem
      .readText(path)
      .then((text) => isCurrent && setDoc(parseMarkdown(splitSceneFile(text).body)))
      .catch(() => undefined);
    return () => void (isCurrent = false);
  }, [path, project]);
  return doc;
}

function titleOf(app: AppState, beside: Beside) {
  const summaries = { ...app.series?.summaries, ...app.project?.summaries };
  const title = summaries[beside.sceneId]?.title ?? "";
  if (beside.kind === "text") return title;
  const when = beside.snapshot.label ?? snapshotWhen(beside.snapshot.time, Date.now());
  return t("{title}, jämförd med {when}", { title, when });
}

// A version is compared with the open text when that is the one, otherwise with its saved text.
function besideBody(app: AppState, beside: Beside, doc: Node | null) {
  if (beside.kind === "text") return <SceneText doc={doc ?? undefined} />;
  const live = app.scene?.id === beside.sceneId ? app.editor.editorState?.doc : doc;
  const now = live ? live.textBetween(0, live.content.size, "\n\n") : "";
  return <DiffText before={plainText(beside.snapshot.body, "\n\n")} now={now} />;
}

/** Another text, or an older version of this one, beside the text being written. */
export function BesidePane({ app, project }: { app: AppState; project: Project }) {
  const { beside, setBeside } = app.writingMode;
  const doc = useBesideDoc(beside, project);
  if (!beside) return null;
  return (
    <aside className="beside-pane" aria-label={t("Bredvid")}>
      <div className="beside-header">
        <span className="beside-title">{titleOf(app, beside)}</span>
        <button className="review-close" aria-label={t("Stäng")} onClick={() => setBeside(null)}>
          ×
        </button>
      </div>
      <div className="beside-body manuscript">{besideBody(app, beside, doc)}</div>
    </aside>
  );
}
