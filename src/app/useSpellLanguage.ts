import { useEffect, useRef } from "react";
import { bookLanguage } from "../project/bookLanguage.js";
import { platform } from "./platform.js";
import type { SceneSession } from "./sceneSession.js";
import type { Project } from "./useProject.js";

/** Saves the open scene first, since the window restarts when the language changes. */
export async function applySpellLanguage(session: SceneSession, language: string) {
  await session.autosave.flush();
  await platform.setSpellLanguage(language);
}

/** Spellcheck follows the book that opens; Inställningar applies a change itself, once saved. */
export function useSpellLanguage(project: Project | null, session: SceneSession) {
  const language = useRef("");
  language.current = project ? bookLanguage(project.fields) : "";
  const dir = project?.dir;
  useEffect(() => {
    if (dir) void applySpellLanguage(session, language.current);
  }, [dir, session]);
}
