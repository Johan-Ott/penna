import { bookLanguage } from "../project/bookLanguage.js";
import type { AppState } from "./App.js";
import { canSpeak, paragraphsToRead, speak, stopSpeaking, useSpeaking } from "./speech.js";
import type { Project } from "./useProject.js";
import { useEscape, useShortcut } from "./useShortcut.js";
import { t } from "../i18n/i18n.js";

/** Reads the selection, or from the cursor on, in the book's language. */
export function readAloudFrom(app: Pick<AppState, "editor">, project: Pick<Project, "fields">) {
  const state = app.editor.viewRef.current?.state;
  if (state && canSpeak()) speak(paragraphsToRead(state), bookLanguage(project.fields));
}

/** Uppläsning for the palette and the selection bar: none without a text or a voice. */
export const speechContext = (
  app: Pick<AppState, "editor"> & { scene: unknown },
  project: Pick<Project, "fields">,
) => ({
  readAloud: app.scene && canSpeak() ? () => readAloudFrom(app, project) : null,
});

/** Ctrl+Shift+U reads aloud; while it reads, a pill at the foot stops it, as Escape does. */
export function ReadAloud({ app, project }: { app: AppState; project: Project }) {
  const isSpeaking = useSpeaking();
  const toggle = () => (isSpeaking ? stopSpeaking() : readAloudFrom(app, project));
  useShortcut("u", toggle, { shift: true });
  useEscape(() => {
    if (isSpeaking) stopSpeaking();
  });
  if (!isSpeaking) return null;
  return (
    <button className="read-aloud-pill" onClick={stopSpeaking}>
      <span className="read-aloud-wave" aria-hidden="true" />
      {t("Läser upp · Stoppa")}
    </button>
  );
}
