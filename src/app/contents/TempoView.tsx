import { contentsRows } from "../../project/contents.js";
import { chapterTempo, type ChapterTempo } from "../../project/tempo.js";
import type { Project } from "../useProject.js";
import { numberLocale, t } from "../../i18n/i18n.js";

const format = (count: number) => Math.round(count).toLocaleString(numberLocale());

function Bar({ share, label }: { share: number; label: string }) {
  return (
    <span className="tempo-bar" title={label}>
      <span style={{ width: `${Math.round(Math.min(1, share) * 100)}%` }} />
    </span>
  );
}

type Most = { words: number; sentence: number };

function TempoRow({ chapter, most }: { chapter: ChapterTempo; most: Most }) {
  const dialogue = t("{share} % dialog", { share: Math.round(chapter.dialogue * 100) });
  const sentence = t("{count} ord per mening", { count: format(chapter.sentence) });
  return (
    <div className={chapter.isSlow ? "tempo-row slow" : "tempo-row"}>
      <span className="tempo-title">
        {chapter.number}. {chapter.title}
        {chapter.isSlow && <span className="tempo-flag">{t("Långsamt?")}</span>}
      </span>
      <Bar
        share={chapter.words / (most.words || 1)}
        label={t("{count} ord", { count: format(chapter.words) })}
      />
      <span className="tempo-value">{format(chapter.words)}</span>
      <Bar share={chapter.dialogue} label={dialogue} />
      <span className="tempo-value">{Math.round(chapter.dialogue * 100)} %</span>
      <Bar share={chapter.sentence / (most.sentence || 1)} label={sentence} />
      <span className="tempo-value">{format(chapter.sentence)}</span>
    </div>
  );
}

/** Innehåll's Tempo: each chapter's length, talk and sentence length side by side. */
export function TempoView({ project, texts }: { project: Project; texts: Record<string, string> }) {
  const chapters = chapterTempo(contentsRows(project.tree, project.summaries), texts);
  if (chapters.length === 0) return <p className="review-empty">{t("Inga kapitel än.")}</p>;
  const most = {
    words: Math.max(...chapters.map((chapter) => chapter.words)),
    sentence: Math.max(...chapters.map((chapter) => chapter.sentence)),
  };

  return (
    <section className="tempo" aria-label={t("Tempo")}>
      <div className="tempo-row tempo-head">
        <span />
        <span className="tempo-heading">{t("Längd")}</span>
        <span className="tempo-heading">{t("Dialog")}</span>
        <span className="tempo-heading">{t("Meningslängd")}</span>
      </div>
      {chapters.map((chapter) => (
        <TempoRow key={chapter.id} chapter={chapter} most={most} />
      ))}
      <p className="setting-hint">
        {t("Långsamt? betyder längre än de flesta kapitel, med mindre dialog och längre meningar.")}
      </p>
    </section>
  );
}
