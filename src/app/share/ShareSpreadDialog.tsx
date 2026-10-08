import { useEffect, useRef, useState, type RefObject } from "react";
import { Choice, Dialog, Switch } from "../controls.js";
import { recordFailure } from "../errorLog.js";
import { penMark, startCard, type CardFormat, type Look } from "../studio/studioCanvas.js";
import { copyPng, savePng } from "../studio/studioDraw.js";
import { drawSpread, drawWholeBook } from "./spreadImage.js";
import type { PageBlock } from "./spreadPages.js";
import { t } from "../../i18n/i18n.js";

/** What Dela uppslag shares: the pages on show, or the whole book's pages so far. */
export interface SpreadShare {
  title: string;
  pages: PageBlock[][];
  firstNumber: number;
  written: number;
  total: number;
}

interface Choices {
  subject: "uppslag" | "boken";
  look: Look;
  format: CardFormat;
  isMarked: boolean;
}

function draw(canvas: HTMLCanvasElement, share: SpreadShare, choices: Choices) {
  const card = startCard(canvas, choices.look, choices.format);
  if (!card) return;
  if (choices.subject === "uppslag") drawSpread(card, share.pages, share.firstNumber, share.title);
  else {
    const label = t("{count} sidor hittills", { count: share.written });
    drawWholeBook(card, { title: share.title, label, written: share.written, total: share.total });
  }
  if (choices.isMarked) penMark(card);
}

type ChoiceProps = { choices: Choices; onChange: (choices: Choices) => void };

const subjects = (): [Choices["subject"], string][] => [
  ["uppslag", t("Uppslag")],
  ["boken", t("Hela boken")],
];
const looks = (): [Look, string][] => [
  ["ljus", t("Ljus")],
  ["papper", t("Papper")],
  ["mork", t("Mörk")],
];
const formats = (): [CardFormat, string][] => [
  ["kvadrat", t("Kvadrat")],
  ["story", t("Story")],
  ["liggande", t("Liggande")],
];

function ShareChoices({ choices, onChange }: ChoiceProps) {
  const set = (change: Partial<Choices>) => onChange({ ...choices, ...change });
  return (
    <>
      <Choice
        label={t("Vad")}
        value={choices.subject}
        options={subjects()}
        onSelect={(subject) => set({ subject })}
      />
      <Choice
        label={t("Bakgrund")}
        value={choices.look}
        options={looks()}
        onSelect={(look) => set({ look })}
      />
      <Choice
        label={t("Format")}
        value={choices.format}
        options={formats()}
        onSelect={(format) => set({ format })}
      />
    </>
  );
}

function MarkRow({ choices, onChange }: ChoiceProps) {
  return (
    <div className="design-row">
      <span>{t("Skriven i Penna")}</span>
      <Switch
        label={t("Skriven i Penna")}
        isOn={choices.isMarked}
        onFlip={() => onChange({ ...choices, isMarked: !choices.isMarked })}
      />
    </div>
  );
}

function ShareActions({
  canvas,
  title,
}: {
  canvas: RefObject<HTMLCanvasElement | null>;
  title: string;
}) {
  const run = (action: (element: HTMLCanvasElement) => Promise<void>) =>
    canvas.current && void action(canvas.current).catch(recordFailure("Bilden kunde inte göras"));
  return (
    <div className="studio-actions">
      <button className="button primary" onClick={() => run(copyPng)}>
        {t("Kopiera bild")}
      </button>
      <button
        className="button secondary"
        onClick={() => run((element) => savePng(element, `${title} – uppslag`))}
      >
        {t("Spara bild")}
      </button>
    </div>
  );
}

/** Dela uppslag: the spread on show as a picture, made on this computer; only what is seen is shared. */
export function ShareSpreadDialog({ share, onClose }: { share: SpreadShare; onClose: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [choices, setChoices] = useState<Choices>({
    subject: "uppslag",
    look: "ljus",
    format: "kvadrat",
    isMarked: true,
  });
  useEffect(() => {
    void document.fonts.ready.then(() => canvas.current && draw(canvas.current, share, choices));
  }, [share, choices]);
  return (
    <Dialog label={t("Dela")} className="share-spread" onClose={onClose}>
      <div className="share-spread-body">
        <canvas ref={canvas} className={`studio-card ${choices.format}`} aria-label={t("Bilden")} />
        <div className="share-spread-choices">
          <ShareChoices choices={choices} onChange={setChoices} />
          <MarkRow choices={choices} onChange={setChoices} />
          <ShareActions canvas={canvas} title={share.title} />
          <span className="setting-hint">
            {t("Bara det du ser delas. Bilden skapas på din dator.")}
          </span>
        </div>
      </div>
    </Dialog>
  );
}
