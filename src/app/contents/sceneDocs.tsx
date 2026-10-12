import { readSceneBodies } from "../../project/sceneSummaries.js";
import type { Node } from "prosemirror-model";
import { DOMSerializer } from "prosemirror-model";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { parseMarkdown } from "../../manuscript/parseMarkdown.js";
import { manuscriptSchema } from "../../manuscript/schema.js";
import { platform } from "../platform.js";
import type { Project } from "../useProject.js";

export type Docs = Record<string, Node>;

// Every save reads the project again, and with it the scenes. Null until they are read.
export function useSceneDocs(project: Project, ids: string[], beforeRead: () => Promise<unknown>) {
  const [docs, setDocs] = useState<Docs | null>(null);
  const key = ids.join(",");
  useEffect(() => {
    let isCurrent = true;
    const refs = (key ? key.split(",") : []).map((id) => ({ dir: project.dir, id }));
    void beforeRead()
      .then(() => readSceneBodies(platform.fileSystem, refs))
      .then((bodies) => {
        const docs = Object.entries(bodies).map(([id, body]) => [id, parseMarkdown(body)]);
        if (isCurrent) setDocs(Object.fromEntries(docs));
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
