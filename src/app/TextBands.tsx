import type { AppState } from "./App.js";
import { ReadAloud } from "./ReadAloud.js";
import { SuggestingBar } from "./review/Suggesting.js";
import { SprintBar } from "./sprint/SprintBar.js";
import type { Project } from "./useProject.js";

/** Over the text on the computer and the phone alike: reading aloud, suggestions and a sprint. */
export function TextBands({ app, project }: { app: AppState; project: Project }) {
  return (
    <>
      <ReadAloud app={app} project={project} />
      <SuggestingBar app={app} />
      <SprintBar app={app} />
    </>
  );
}
