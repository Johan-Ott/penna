import type { Node } from "prosemirror-model";
import { DOMSerializer } from "prosemirror-model";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { parseMarkdown } from "../../manuscript/parseMarkdown.js";
import { manuscriptSchema } from "../../manuscript/schema.js";
import { splitSceneFile } from "../../manuscript/sceneFile.js";
import { joinPath } from "../../storage/fileSystem.js";
import { platform } from "../platform.js";
import type { Project } from "../useProject.js";

export type Docs = Record<string, Node>;

// Every save reads the project again, and with it the scenes. Null until they are read.
export function useSceneDocs(project: Project, ids: string[], beforeRead: () => Promise<unknown>) {
  const [docs, setDocs] = useState<Docs | null>(null);
  const key = ids.join(",");
  useEffect(() => {
    let isCurrent = true;
    const read = async (id: string) => {
      const text = await platform.fileSystem.readText(joinPath(project.dir, `scenes/${id}.md`));
      return [id, parseMarkdown(splitSceneFile(text).body)] as const;
    };
    const wanted = key ? key.split(",") : [];
    void beforeRead()
      .then(() => Promise.all(wanted.map((id) => read(id).catch(() => null))))
      .then((entries) => {
        if (isCurrent) setDocs(Object.fromEntries(entries.filter((entry) => entry !== null)));
      });
    return () => void (isCurrent = false);
  }, [project, key, beforeRead]);
  return docs;
}

const serializer = DOMSerializer.fromSchema(manuscriptSchema);

// Uses the editor's markup and CSS, so the text looks as it does in Skriv.
export function SceneText(props: { doc: Node | undefined }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (ref.current && props.doc) {
      ref.current.replaceChildren(serializer.serializeFragment(props.doc.content));
    }
  }, [props.doc]);
  return <div ref={ref} className="read-text" />;
}
