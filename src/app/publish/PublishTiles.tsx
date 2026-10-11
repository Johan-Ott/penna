import { t } from "../../i18n/i18n.js";

export type Step = "design" | "details" | "export";

const LABELS: Record<Step, string> = {
  design: t("Design"),
  details: t("Bokuppgifter"),
  export: t("Exportera"),
};

function Tile(props: { name: string; hint: string; onOpen: () => void }) {
  return (
    <button className="publish-tile" onClick={props.onOpen}>
      <span className="publish-tile-name">{props.name}</span>
      <span className="insight-muted">{props.hint}</span>
    </button>
  );
}

/** Publicera's start: four tiles, each opening its part, so nothing is a long list to scroll. */
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
