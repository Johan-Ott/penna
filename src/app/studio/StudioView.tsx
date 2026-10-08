import { useEffect, useRef, useState } from "react";
import { recordFailure } from "../errorLog.js";
import type { Project } from "../useProject.js";
import {
  bookField,
  copyPng,
  drawCard,
  savePng,
  type ImageCardId,
  type ImageChoices,
  type StudioData,
} from "./studioDraw.js";
import { BookField, ImagePanel, NewsletterPanel, useNewsletter } from "./StudioPanels.js";
import { t } from "../../i18n/i18n.js";

type CardId = ImageCardId | "nyhetsbrev";

interface StudioProps extends StudioData {
  onSaveFields: (fields: Record<string, unknown>) => void;
  onBack: () => void;
}

function groups(): [string, [CardId, string, string][]][] {
  return [
    [
      t("Skrivande"),
      [
        ["vecka", t("Veckan i siffror"), t("Ord, dagar och streak")],
        ["skrivar", t("Ditt skrivår"), t("Hela året, i alla böcker")],
      ],
    ],
    [
      t("Lansering"),
      [
        ["nedrakning", t("Nedräkning"), t("Dagar kvar till release")],
        ["handeln", t("Nu i handeln"), t("Med ett citat ur boken")],
      ],
    ],
    [t("Läsare"), [["nyhetsbrev", t("Kapitel till nyhetsbrev"), t("Substack, Patreon, e-post")]]],
  ];
}

function StudioNav(props: { card: CardId; onCard: (card: CardId) => void; onBack: () => void }) {
  return (
    <aside className="studio-nav" aria-label={t("Studio")}>
      <button className="link-button quiet publish-back" onClick={props.onBack}>
        {t("← Publicera")}
      </button>
      {groups().map(([label, items]) => (
        <div key={label} className="studio-group">
          <span className="sidebar-heading">{label}</span>
          {items.map(([id, name, hint]) => (
            <button
              key={id}
              className="studio-item"
              aria-pressed={props.card === id}
              onClick={() => props.onCard(id)}
            >
              <span className="studio-item-name">{name}</span>
              <span className="insight-muted">{hint}</span>
            </button>
          ))}
        </div>
      ))}
    </aside>
  );
}

function cardExtra(card: CardId, props: StudioProps) {
  const save = (key: string) => (value: string) =>
    props.onSaveFields({ [key]: value.trim() || undefined });
  if (card === "nedrakning")
    return (
      <BookField
        label={t("Utgivningsdag")}
        type="date"
        value={bookField(props.project, "releaseDate")}
        onSave={save("releaseDate")}
      />
    );
  if (card === "handeln")
    return (
      <BookField
        label={t("Citat ur boken")}
        value={bookField(props.project, "quote")}
        onSave={save("quote")}
      />
    );
  return null;
}

// Drawn again after every change; the fonts are waited for, or the canvas would use fallbacks.
function useCardCanvas(card: ImageCardId, choices: ImageChoices, data: StudioData) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    void document.fonts.ready.then(
      () => canvas.current && drawCard(canvas.current, card, choices, data),
    );
  });
  return canvas;
}

function ImageCard(props: StudioProps & { card: ImageCardId }) {
  const [choices, setChoices] = useState<ImageChoices>({
    look: "papper",
    format: "kvadrat",
    isMarked: true,
  });
  const canvas = useCardCanvas(props.card, choices, props);
  const run = (action: (element: HTMLCanvasElement) => Promise<void>) =>
    canvas.current && void action(canvas.current).catch(recordFailure("Bilden kunde inte göras"));
  const name = `${props.project.name} – ${props.card}`;
  return (
    <>
      <div className="studio-stage">
        <canvas ref={canvas} className={`studio-card ${choices.format}`} aria-label={t("Bilden")} />
      </div>
      <div className="studio-panel">
        <ImagePanel
          choices={choices}
          onChange={setChoices}
          extra={cardExtra(props.card, props)}
          onCopy={() => run(copyPng)}
          onSave={() => run((element) => savePng(element, name))}
        />
      </div>
    </>
  );
}

// The mail as the reader gets it; the HTML is the writer's own text, so it is shown as HTML.
function Newsletter({ project }: { project: Project }) {
  const letter = useNewsletter(project);
  return (
    <>
      <div className="studio-stage">
        <div className="studio-mail">
          <span className="studio-mail-subject">
            {t("Ämne: {title}", { title: `${project.name}: ${letter.title}` })}
          </span>
          <div className="studio-mail-body" dangerouslySetInnerHTML={{ __html: letter.html }} />
        </div>
      </div>
      <div className="studio-panel">
        <NewsletterPanel letter={letter} />
      </div>
    </>
  );
}

/** Studio: pictures to share about the writing and the book, and chapters for readers. */
export function StudioView(props: StudioProps) {
  const [card, setCard] = useState<CardId>("vecka");
  return (
    <div className="studio">
      <StudioNav card={card} onCard={setCard} onBack={props.onBack} />
      <main className="studio-main">
        {card === "nyhetsbrev" ? (
          <Newsletter project={props.project} />
        ) : (
          <ImageCard {...props} card={card} />
        )}
      </main>
    </div>
  );
}
