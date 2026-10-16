import { createStore } from "../store.js";
import { t } from "../../i18n/i18n.js";

export type Step = "design" | "details" | "export" | "forlag";

/** The part of Publicera that is open, so a phone's top bar can name it and lead back. */
export const publishStep = createStore<Step | null>(null);

const LABELS: Record<Step, string> = {
  design: t("Design"),
  details: t("Bokuppgifter"),
  export: t("Exportera"),
  forlag: t("Till förlag"),
};

export const stepLabel = (step: Step) => LABELS[step];

function Tile(props: { name: string; hint: string; onOpen: () => void }) {
  return (
    <button className="publish-tile" onClick={props.onOpen}>
      <span className="publish-tile-name">{props.name}</span>
      <span className="insight-muted">{props.hint}</span>
    </button>
  );
}

/** Publicera's start: five tiles, each opening its part, so nothing is a long list to scroll. */
export function PublishTiles(props: {
  formatName: string;
  onStep: (step: Step) => void;
  onStudio: () => void;
}) {
  return (
    <div className="publish-tiles">
      <Tile
        name={LABELS.design}
        hint={t("Tema, sidor och typsnitt")}
        onOpen={() => props.onStep("design")}
      />
      <Tile
        name={LABELS.details}
        hint={t("Titel, författare och omslag")}
        onOpen={() => props.onStep("details")}
      />
      <Tile name={LABELS.export} hint={props.formatName} onOpen={() => props.onStep("export")} />
      <Tile name={t("Studio")} hint={t("Bilder och nyhetsbrev")} onOpen={props.onStudio} />
      <Tile
        name={LABELS.forlag}
        hint={t("Synopsis, följebrev och vart du har skickat")}
        onOpen={() => props.onStep("forlag")}
      />
    </div>
  );
}

/** Over an open part: its name, and the way back to the tiles that back on a phone takes. */
export function StepHead({ step, onBack }: { step: Step; onBack: () => void }) {
  return (
    <div className="publish-step-head">
      <button className="link-button quiet" data-phone-back onClick={onBack}>
        {t("← Publicera")}
      </button>
      <h2 className="publish-step-title">{LABELS[step]}</h2>
    </div>
  );
}
