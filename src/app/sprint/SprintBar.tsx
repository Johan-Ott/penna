import { useEffect, useState } from "react";
import type { AppState } from "../App.js";
import { platform } from "../platform.js";
import {
  closeSprintResult,
  endSprint,
  setStartWords,
  SPRINT_LENGTHS,
  startSprint,
  useSprint,
  type Sprint,
} from "./sprint.js";
import { t } from "../../i18n/i18n.js";

const clock = (milliseconds: number) => {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};

function useTick() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

// The words since the sprint began, counted from the day's words as they are saved.
function Running({ sprint, todayWords }: { sprint: Sprint; todayWords: number }) {
  const now = useTick();
  const words = Math.max(0, todayWords - (sprint.startWords ?? todayWords));
  useEffect(() => {
    if (sprint.startWords === null) setStartWords(todayWords);
  }, [sprint.startWords, todayWords]);
  useEffect(() => {
    if (now < sprint.endsAt) return;
    endSprint(words);
    const text = t("{words} ord på {minutes} minuter.", { words, minutes: sprint.minutes });
    void platform.notify(t("Sprinten är klar"), text).catch(() => undefined);
  }, [now, sprint, words]);
  return (
    <div className="sprint-bar" role="timer">
      <span className="sprint-clock">{clock(sprint.endsAt - now)}</span>
      <span>{t("{words} ord", { words })}</span>
      <button className="link-button" onClick={() => endSprint(words)}>
        {t("Avsluta")}
      </button>
    </div>
  );
}

/** Over the text while a sprint runs, and its result once it is over. */
export function SprintBar({ app }: { app: Pick<AppState, "today"> }) {
  const { sprint, done } = useSprint();
  if (sprint) return <Running sprint={sprint} todayWords={app.today.words} />;
  if (!done) return null;
  return (
    <div className="sprint-bar" role="status">
      <span>
        {t("Sprinten är klar: {words} ord på {minutes} minuter.", {
          words: done.words,
          minutes: done.minutes,
        })}
      </span>
      <button className="link-button" onClick={closeSprintResult}>
        {t("Stäng")}
      </button>
    </div>
  );
}

/** In Insikter: a sprint of fifteen, twenty-five or forty-five minutes. */
export function SprintChoices({ onStart }: { onStart: () => void }) {
  return (
    <section className="sprint-choices">
      <span className="progress-label">{t("Skrivsprint")}</span>
      <div className="chip-row">
        {SPRINT_LENGTHS.map((minutes) => (
          <button key={minutes} className="chip" onClick={() => (startSprint(minutes), onStart())}>
            {t("{minutes} min", { minutes })}
          </button>
        ))}
      </div>
    </section>
  );
}
