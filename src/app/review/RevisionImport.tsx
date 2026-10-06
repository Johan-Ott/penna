import { useState } from "react";
import { documentText } from "../../editor/documentText.js";
import { readBookScenes } from "../../export/book.js";
import { writeRevision } from "../../project/revisions.js";
import { Dialog } from "../controls.js";
import { recordFailure } from "../errorLog.js";
import { platform } from "../platform.js";
import type { Project } from "../useProject.js";
import { t } from "../../i18n/i18n.js";

const WORD = { name: t("Word-dokument"), extensions: ["docx"] };

/** What reading the file found: the scenes the editor changed, and how many scenes it held. */
interface ReadBack {
  changed: string[];
  found: number;
}

// Only scenes whose text differs get an editor's version; the rest are left alone.
async function readEditorsFile(project: Project): Promise<ReadBack | null> {
  const picked = await platform.pickFile(WORD);
  if (!picked) return null;
  const { revisionTexts } = await import("../../import/revisionImport.js");
  const texts = await revisionTexts(picked.bytes);
  const changed: string[] = [];
  for (const [sceneId, text] of texts) {
    if (!project.scenes.includes(sceneId)) continue;
    const scenes = await readBookScenes(platform.fileSystem, project.dir, [sceneId], {});
    const doc = scenes.get(sceneId);
    if (doc && documentText(doc).text === text) continue;
    await writeRevision(platform.fileSystem, project.dir, sceneId, text);
    changed.push(sceneId);
  }
  return { changed, found: texts.size };
}

function ChangedScenes(props: {
  project: Project;
  readBack: ReadBack;
  onOpenScene: (id: string) => void;
}) {
  const { readBack } = props;
  return (
    <>
      <p>
        {t(
          "Redaktören har ändrat i {count} scener. Öppna en och gå igenom ändringarna under Granska.",
          { count: readBack.changed.length },
        )}
      </p>
      <div className="revision-scenes">
        {readBack.changed.map((sceneId) => (
          <button key={sceneId} className="link-button" onClick={() => props.onOpenScene(sceneId)}>
            {props.project.summaries[sceneId]?.title ?? sceneId}
          </button>
        ))}
      </div>
    </>
  );
}

function ReadBackMessage(props: {
  project: Project;
  readBack: ReadBack;
  onOpenScene: (id: string) => void;
}) {
  const { readBack } = props;
  if (readBack.found === 0) {
    return (
      <p>
        {t(
          "Filen saknar Pennas markeringar. Läs in ett manus som exporterats från Penna och redigerats i Word.",
        )}
      </p>
    );
  }
  if (readBack.changed.length === 0)
    return <p>{t("Redaktören har inte ändrat något i texten.")}</p>;
  return <ChangedScenes {...props} />;
}

/** "Läs in redaktörens Word-fil": the menu item, and the answer once the file is read. */
export function useRevisionImport(
  project: Project,
  onRead: () => void,
  onOpenScene: (id: string) => void,
) {
  const [readBack, setReadBack] = useState<ReadBack | null>(null);
  const open = () =>
    void readEditorsFile(project)
      .then((found) => {
        setReadBack(found);
        onRead();
      })
      .catch(recordFailure("Redigering"));
  const close = () => setReadBack(null);
  const layer = readBack && (
    <Dialog label={t("Redaktörens ändringar")} onClose={close}>
      <ReadBackMessage
        project={project}
        readBack={readBack}
        onOpenScene={(id) => (close(), onOpenScene(id))}
      />
      <div className="dialog-actions">
        <button className="button primary" onClick={close}>
          {t("Stäng")}
        </button>
      </div>
    </Dialog>
  );
  return { open, layer };
}
