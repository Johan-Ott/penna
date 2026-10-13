import { useEffect } from "react";
import { TimerIcon } from "../shell/icons.js";
import type { AppState } from "../App.js";
import { platform } from "../platform.js";
import {
  closeSprintResult,
  endSprint,
  minutesOf,
  nextPhase,
  phasesOf,
  setPanelOpen,
  setStartWords,
  useSprint,
  type Phase,
  type Sprint,
} from "./sprint.js";
import { clock, sprintWords, useTick } from "./sprintClock.js";
import { SprintPanel } from "./SprintPanel.js";
import { t } from "../../i18n/i18n.js";

// `wordsAtEnd` once the sprint is over; else the phase that begins is said.
function phaseMessage(sprint: Sprint, next: Phase | undefined, wordsAtEnd: number | null) {
  if (wordsAtEnd !== null) return t("Sprinten är klar: {words} ord.", { words: wordsAtEnd });
  if (next === "pass") return t("Dags att skriva igen.");
  return t("Paus i {minutes} minuter.", { minutes: minutesOf(sprint.plan, next ?? "kort") });
}

// Each phase's end moves the sprint on, with a word to the writer: a break, back to writing, or
// the sprint's end.
function usePhaseEnds(sprint: Sprint, words: number, now: number) {
  useEffect(() => {
    if (now < sprint.endsAt) return;
    const next = phasesOf(sprint.plan)[sprint.phase + 1];
    const isGoingOn = nextPhase(words);
    void platform
      .notify(t("Skrivsprint"), phaseMessage(sprint, next, isGoingOn ? null : words))
      .catch(() => undefined);
  }, [now, sprint, words]);
}

// Over the text while a sprint runs; a click opens its block.
function Running({ sprint, todayWords }: { sprint: Sprint; todayWords: number }) {
  const now = useTick();
  const words = sprintWords(sprint, todayWords);
  useEffect(() => {
    if (sprint.startWords === null) setStartWords(todayWords);
  }, [sprint.startWords, todayWords]);
  usePhaseEnds(sprint, words, now);
  const isBreak = phasesOf(sprint.plan)[sprint.phase] !== "pass";
  return (
    <div className="sprint-bar" role="timer">
      <button className="sprint-clock" onClick={() => setPanelOpen(true)}>
        {isBreak ? `${t("Paus")} ${clock(sprint.endsAt - now)}` : clock(sprint.endsAt - now)}
      </button>
      <span>{t("{words} ord", { words })}</span>
      <button className="link-button" onClick={() => endSprint(words)}>
        {t("Avsluta")}
      </button>
    </div>
  );
}

function Result({ done }: { done: { passes: number; words: number } }) {
  return (
    <div className="sprint-bar" role="status">
      <span>
        {t("Sprinten är klar: {words} ord på {passes} pass.", {
          words: done.words,
          passes: done.passes,
        })}
      </span>
      <button className="link-button" onClick={closeSprintResult}>
        {t("Stäng")}
      </button>
    </div>
  );
}

/** Over the text: the sprint's block when open, its bar while it runs, and its result. */
export function SprintBar({ app }: { app: Pick<AppState, "today"> }) {
  const { sprint, done } = useSprint();
  return (
    <>
      <SprintPanel todayWords={app.today.words} />
      {sprint && <Running sprint={sprint} todayWords={app.today.words} />}
      {!sprint && done && <Result done={done} />}
    </>
  );
}

/** In the blocks' dock, or a phone's bar: opens the sprint's block, to set it up or see it run. */
export function SprintButton({ look = "topbar-button" }: { look?: string }) {
  const { sprint, isPanelOpen } = useSprint();
  const state = [isPanelOpen && "chosen", sprint && "playing"].filter(Boolean).join(" ");
  return (
    <button
      className={state ? `${look} ${state}` : look}
      aria-label={t("Skrivsprint")}
      aria-pressed={isPanelOpen}
      title={t("Skrivsprint")}
      onClick={() => setPanelOpen(!isPanelOpen)}
    >
      <TimerIcon />
    </button>
  );
}
