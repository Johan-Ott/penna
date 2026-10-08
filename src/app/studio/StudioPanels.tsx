import { useEffect, useState, type ReactNode } from "react";
import type { Node } from "prosemirror-model";
import { manuscriptNodes } from "../../project/tree.js";
import { Choice, Switch } from "../controls.js";
import { recordFailure } from "../errorLog.js";
import type { Project } from "../useProject.js";
import { chapterBlocks, copyHtml, mailHtml, simpleHtml } from "./newsletter.js";
import type { CardFormat, Look } from "./studioCanvas.js";
import type { ImageChoices } from "./studioDraw.js";
import { t } from "../../i18n/i18n.js";

const looks = (): [Look, string][] => [
  ["papper", t("Papper")],
  ["ljus", t("Ljus")],
  ["mork", t("Mörk")],
];
const formats = (): [CardFormat, string][] => [
  ["kvadrat", t("Kvadrat")],
  ["story", t("Story")],
];

function LookChoices({
  choices,
  onChange,
}: {
  choices: ImageChoices;
  onChange: (choices: ImageChoices) => void;
}) {
  const set = (change: Partial<ImageChoices>) => onChange({ ...choices, ...change });
  return (
    <>
      <span className="studio-label">{t("Bakgrund")}</span>
      <Choice
        label={t("Bakgrund")}
        value={choices.look}
        options={looks()}
        onSelect={(look) => set({ look })}
      />
      <span className="studio-label">{t("Format")}</span>
      <Choice
        label={t("Format")}
        value={choices.format}
        options={formats()}
        onSelect={(format) => set({ format })}
      />
    </>
  );
}

/** Background, format and the corner mark of an image card, the card's own words, and copy or save. */
export function ImagePanel(props: {
  choices: ImageChoices;
  onChange: (choices: ImageChoices) => void;
  extra: ReactNode;
  onCopy: () => void;
  onSave: () => void;
}) {
  return (
    <>
      <LookChoices choices={props.choices} onChange={props.onChange} />
      <div className="design-row">
        <span>{t("Skriven i Penna")}</span>
        <Switch
          label={t("Skriven i Penna")}
          isOn={props.choices.isMarked}
          onFlip={() => props.onChange({ ...props.choices, isMarked: !props.choices.isMarked })}
        />
      </div>
      {props.extra}
      <div className="studio-actions">
        <button className="button primary" onClick={props.onCopy}>
          {t("Kopiera bild")}
        </button>
        <button className="button secondary" onClick={props.onSave}>
          {t("Spara bild")}
        </button>
      </div>
    </>
  );
}

/** A field of the book, saved when the writer leaves it. */
export function BookField(props: {
  label: string;
  type?: string;
  value: string;
  onSave: (value: string) => void;
}) {
  return (
    <label className="profile-field">
      <span className="studio-label">{props.label}</span>
      <input
        type={props.type ?? "text"}
        defaultValue={props.value}
        onBlur={(event) => props.onSave(event.target.value)}
      />
    </label>
  );
}

function useChapter(project: Project, chapterId: string, isExcerpt: boolean) {
  const [blocks, setBlocks] = useState<Node[]>([]);
  useEffect(() => {
    let isCurrent = true;
    void chapterBlocks(project, chapterId, isExcerpt)
      .then((found) => isCurrent && setBlocks(found))
      .catch(recordFailure("Kapitlet kunde inte läsas"));
    return () => void (isCurrent = false);
  }, [project, chapterId, isExcerpt]);
  return blocks;
}

/** Kapitel till nyhetsbrev: the chapter as HTML on the clipboard; Penna sends nothing itself. */
export function useNewsletter(project: Project) {
  const chapters = manuscriptNodes(project.tree, "chapter");
  const [chapterId, setChapterId] = useState(chapters[0]?.id ?? "");
  const [isExcerpt, setExcerpt] = useState(true);
  const blocks = useChapter(project, chapterId, isExcerpt);
  const title = chapters.find((chapter) => chapter.id === chapterId)?.title ?? "";
  const intro = t(
    "Hej! Här är {chapter}, precis som det ser ut i mitt utkast just nu. Säg gärna vad du tycker.",
    { chapter: title },
  );
  const html = mailHtml(title, intro, blocks);
  return { chapters, chapterId, setChapterId, isExcerpt, setExcerpt, blocks, title, html };
}

type Letter = ReturnType<typeof useNewsletter>;

function ChapterChoice({ letter }: { letter: Letter }) {
  const scopes: ["utdrag" | "hela", string][] = [
    ["utdrag", t("Utdrag, cirka 600 ord")],
    ["hela", t("Hela kapitlet")],
  ];
  return (
    <>
      <label className="profile-field">
        <span className="studio-label">{t("Kapitel")}</span>
        <select
          value={letter.chapterId}
          onChange={(event) => letter.setChapterId(event.target.value)}
        >
          {letter.chapters.map((chapter) => (
            <option key={chapter.id} value={chapter.id}>
              {chapter.title}
            </option>
          ))}
        </select>
      </label>
      <Choice
        label={t("Vad som skickas")}
        value={letter.isExcerpt ? "utdrag" : "hela"}
        options={scopes}
        onSelect={(scope) => letter.setExcerpt(scope === "utdrag")}
      />
    </>
  );
}

export function NewsletterPanel({ letter }: { letter: Letter }) {
  const copy = (html: string) => void copyHtml(html).catch(recordFailure("Kunde inte kopiera"));
  return (
    <>
      <ChapterChoice letter={letter} />
      <span className="studio-label">{t("Kopiera färdigformaterat för")}</span>
      <button
        className="button secondary"
        onClick={() => copy(simpleHtml(letter.title, letter.blocks))}
      >
        {t("Substack och Patreon")}
      </button>
      <button className="button primary" onClick={() => copy(letter.html)}>
        {t("E-post (HTML)")}
      </button>
      <span className="setting-hint">
        {t("Penna skickar inget själv. Du klistrar in där du redan har dina läsare.")}
      </span>
    </>
  );
}
