import { useEffect } from "react";
import { cursorAt } from "../../editor/commands.js";
import { positionAfter } from "../../editor/documentText.js";
import { sentenceBefore } from "../../editor/focus.js";
import { daysBetween, lastWeek } from "../../project/progress.js";
import { dayKey, type Stats } from "../../project/stats.js";
import { chapterOf } from "../../project/treeLabels.js";
import type { useEditorView } from "../../editor/useEditorView.js";
import { usePhone } from "../phone/usePhone.js";
import type { Project } from "../useProject.js";
import { showResume, useResume, type Place } from "./lastPlace.js";
import { numberLocale, t } from "../../i18n/i18n.js";

const format = (count: number) => count.toLocaleString(numberLocale());

function whenText(writtenAt: number, words: number) {
  const days = daysBetween(dayKey(writtenAt), dayKey(Date.now()));
  const count = format(words);
  if (days <= 0) return t("{count} ord idag", { count });
  const day = t("{count} ord den dagen", { count });
  if (days === 1)
    return `${new Date(writtenAt).getHours() >= 17 ? t("Igår kväll") : t("Igår")} · ${day}`;
  return `${t("För {count} dagar sedan", { count: days })} · ${day}`;
}

function whereText(project: Project, sceneId: string) {
  const chapter = chapterOf(project.tree, sceneId);
  const scene = project.summaries[sceneId]?.title ?? "";
  return [t("Du slutade här"), chapter && `${chapter.number}. ${chapter.title}`, scene]
    .filter(Boolean)
    .join(" · ");
}

function WeekLine({ stats }: { stats: Stats }) {
  const week = lastWeek(stats, dayKey(Date.now()));
  if (week.words === 0) return null;
  const text = t("Förra veckan: {words} ord på {days} dagar", {
    words: format(week.words),
    days: week.days,
  });
  return (
    <span className="resume-week">
      {week.isBest ? `${text}, ${t("din bästa vecka hittills")}` : text}
    </span>
  );
}

function ResumeText(props: { project: Project; stats: Stats; place: Place; sentence: string }) {
  const { place } = props;
  const words = props.stats[dayKey(place.writtenAt)] ?? 0;
  return (
    <>
      <span className="resume-where">{whereText(props.project, place.sceneId)}</span>
      <p className="resume-sentence">
        {props.sentence}
        <span className="resume-caret" />
      </p>
      <span className="resume-when">{whenText(place.writtenAt, words)}</span>
      <WeekLine stats={props.stats} />
      <span className="resume-hint">
        {usePhone() ? t("Tryck så fortsätter du här") : t("Börja skriva så fortsätter du här")}
      </span>
    </>
  );
}

/** Du slutade här: the sentence the writer stopped in; a key or a click goes on from there. */
export function ResumeScreen(props: {
  project: Project;
  stats: Stats;
  editor: ReturnType<typeof useEditorView>;
}) {
  const place = useResume();
  const { editor } = props;
  const doc = editor.editorState?.doc;
  const position = place && doc ? positionAfter(doc, place.before ?? "", place.position) : 0;
  const goOn = () => {
    if (!place) return;
    showResume(null);
    editor.run(cursorAt(position));
    editor.requestFocus();
  };
  useEffect(() => {
    if (!place) return;
    window.addEventListener("keydown", goOn);
    return () => window.removeEventListener("keydown", goOn);
  });
  if (!place || !doc) return null;
  return (
    <button className="resume-screen" aria-label={t("Fortsätt skriva")} onClick={goOn}>
      <ResumeText {...props} place={place} sentence={sentenceBefore(doc, position)} />
    </button>
  );
}
