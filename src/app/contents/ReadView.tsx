import type { Node } from "prosemirror-model";
import { DOMSerializer } from "prosemirror-model";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { proseStyle, type WritingSettings } from "../../editor/writingSettings.js";
import { parseMarkdown } from "../../manuscript/parseMarkdown.js";
import { manuscriptSchema } from "../../manuscript/schema.js";
import { splitSceneFile } from "../../manuscript/sceneFile.js";
import { readingScenes, type ReadingScene } from "../../project/reading.js";
import { joinPath } from "../../storage/fileSystem.js";
import { platform } from "../platform.js";
import type { Project } from "../useProject.js";
import { useEscape } from "../useShortcut.js";
import { t } from "../../i18n/i18n.js";

interface ReadViewProps {
  project: Project;
  /** The chapter to read, or null for the whole book. */
  chapterId: string | null;
  settings: WritingSettings;
  /** A click in the text: the scene opens in Skriv with the cursor at that paragraph. */
  onOpenAt: (sceneId: string, blockIndex: number) => void;
  onBack: () => void;
}

// The scenes are read again whenever the project is, which every save brings about.
function useSceneDocs(project: Project, ids: string[]) {
  const [docs, setDocs] = useState<Record<string, Node>>({});
  const key = ids.join(",");
  useEffect(() => {
    let isCurrent = true;
    const read = async (id: string) => {
      const text = await platform.fileSystem.readText(joinPath(project.dir, `scenes/${id}.md`));
      return [id, parseMarkdown(splitSceneFile(text).body)] as const;
    };
    const wanted = key ? key.split(",") : [];
    void Promise.all(wanted.map((id) => read(id).catch(() => null))).then((entries) => {
      if (isCurrent) setDocs(Object.fromEntries(entries.filter((entry) => entry !== null)));
    });
    return () => void (isCurrent = false);
  }, [project, key]);
  return docs;
}

const serializer = DOMSerializer.fromSchema(manuscriptSchema);

// The scene drawn with the editor's own markup, so it looks as it does when written.
function SceneText(props: { doc: Node | undefined; onClickBlock: (index: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (ref.current && props.doc) {
      ref.current.replaceChildren(serializer.serializeFragment(props.doc.content));
    }
  }, [props.doc]);
  const onClick = (target: EventTarget) => {
    const blocks = Array.from(ref.current?.children ?? []);
    const index = blocks.findIndex((block) => block.contains(target as globalThis.Node));
    props.onClickBlock(Math.max(0, index));
  };
  return <div ref={ref} className="read-text" onClick={(event) => onClick(event.target)} />;
}

function ReadScene(props: ReadViewProps & { scene: ReadingScene; doc: Node | undefined }) {
  const { scene } = props;
  const open = (index: number) => props.onOpenAt(scene.sceneId, index);
  return (
    <section className="read-scene">
      {scene.chapterTitle && <h2 className="read-chapter">{scene.chapterTitle}</h2>}
      <button className="read-scene-title" onClick={() => open(0)}>
        {props.project.summaries[scene.sceneId]?.title ?? ""}
      </button>
      <SceneText doc={props.doc} onClickBlock={open} />
    </section>
  );
}

/** Läs: a chapter or the whole book in one go; a click goes back to writing at that spot. */
export function ReadView(props: ReadViewProps) {
  const scenes = readingScenes(props.project.tree, props.chapterId);
  const docs = useSceneDocs(
    props.project,
    scenes.map((scene) => scene.sceneId),
  );
  useEscape(props.onBack);
  return (
    <main className="read-view">
      <div className="manuscript read-column" style={proseStyle(props.settings) as CSSProperties}>
        <button className="link-button quiet read-back" onClick={props.onBack}>
          {t("← Tillbaka till texten")}
        </button>
        {scenes.length === 0 && <p className="contents-empty">{t("Inga scener än.")}</p>}
        {scenes.map((scene) => (
          <ReadScene key={scene.sceneId} {...props} scene={scene} doc={docs[scene.sceneId]} />
        ))}
      </div>
    </main>
  );
}
