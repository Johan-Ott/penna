import { CoverFields } from "./CoverFields.js";
import { useState, type ReactNode } from "react";
import { designOf, type BookDesign } from "../../export/bookDesign.js";
import type { Typography } from "../../export/book.js";
import { DesignControls } from "../bookdesign/DesignControls.js";
import { PrintPreview } from "../bookdesign/PrintPreview.js";
import { BookFields } from "../exporting/BookFields.js";
import { ExportStatus, Preview } from "../exporting/ExportPanels.js";
import { useCover } from "../exporting/useCover.js";
import {
  startChoices,
  useExport,
  type ExportChoices,
  type ExportFormat,
} from "../exporting/useExport.js";
import { Choice } from "../controls.js";
import type { Project } from "../useProject.js";
import { t } from "../../i18n/i18n.js";

interface PublishProps {
  project: Project;
  generalAuthor: string;
  onSaveFields: (fields: Record<string, unknown>) => void;
  onOpenScene: (title: string) => void;
  onBack: () => void;
}

type Step = "design" | "details" | "export";

const FORMATS: [ExportFormat, string, string, string][] = [
  [
    "manus",
    t("Standardmanus"),
    t("Exportera manus"),
    t("Till förlag och agenter. 12 pt, dubbelt radavstånd, namn och titel i sidhuvudet."),
  ],
  [
    "ebok",
    t("E-bok"),
    t("Exportera e-bok"),
    t("EPUB 3 med omslag och innehållsförteckning, redo för e-bokhandlare."),
  ],
  [
    "tryck",
    t("Tryck-PDF"),
    t("Exportera tryck-PDF"),
    t("Satt enligt designen, med marginaler och sidnummer för tryck på beställning."),
  ],
  [
    "omslag",
    t("Tryckomslag"),
    t("Exportera omslag"),
    t("Baksida, rygg och framsida i en PDF med 3 mm utfall. Ryggen räknas fram ur sidantalet."),
  ],
];

const TYPOGRAPHY: [Typography, string][] = [
  ["svensk", t("Svensk")],
  ["engelsk", t("Engelsk")],
];

function ExportStep(
  props: PublishProps & { choices: ExportChoices; setChoices: (next: ExportChoices) => void },
) {
  const { choices, setChoices } = props;
  const format = FORMATS.find(([id]) => id === choices.format);
  return (
    <div className="publish-fields">
      <Choice
        label={t("Format")}
        value={choices.format}
        options={FORMATS.map(([id, label]) => [id, label])}
        onSelect={(next) => setChoices({ ...choices, format: next })}
      />
      <span className="setting-hint">{format?.[3]}</span>
      {choices.format === "omslag" && <CoverFields {...props} />}
      <span className="export-heading">{t("Typografi")}</span>
      <Choice
        label={t("Typografi")}
        value={choices.typography}
        options={TYPOGRAPHY}
        onSelect={(typography) => setChoices({ ...choices, typography })}
      />
      <span className="setting-hint">
        {choices.typography === "svensk"
          ? t("Talstreck i repliker och ”svenska citattecken”, som i manuset.")
          : t("“Engelska citattecken”. Talstrecken behålls.")}
      </span>
    </div>
  );
}

function StepBox(props: {
  number: number;
  label: string;
  isOpen: boolean;
  onOpen: () => void;
  children: ReactNode;
}) {
  return (
    <section className={props.isOpen ? "publish-step open" : "publish-step"}>
      <button className="publish-step-head" aria-expanded={props.isOpen} onClick={props.onOpen}>
        <span className="publish-step-number">{props.number}</span>
        <span>{props.label}</span>
      </button>
      {props.isOpen && <div className="publish-step-body">{props.children}</div>}
    </section>
  );
}

type Publishing = ReturnType<typeof usePublishing>;

function usePublishing(props: PublishProps) {
  const { project } = props;
  const [step, setStep] = useState<Step>("design");
  const [choices, setChoices] = useState(() => startChoices(project));
  const exporter = useExport(project, props.generalAuthor, props.onSaveFields);
  const cover = useCover(project);
  const stepProps = (id: Step) => ({ isOpen: step === id, onOpen: () => setStep(id) });
  return { step, choices, setChoices, exporter, cover, stepProps };
}

function Steps({ props, publishing }: { props: PublishProps; publishing: Publishing }) {
  const { choices, setChoices, stepProps } = publishing;
  const design = designOf(props.project.fields);
  const saveDesign = (change: Partial<BookDesign>) =>
    props.onSaveFields({ design: { ...design, ...change } });
  return (
    <>
      <StepBox number={1} label={t("Design")} {...stepProps("design")}>
        <DesignControls design={design} save={saveDesign} dir={props.project.dir} />
      </StepBox>
      <StepBox number={2} label={t("Bokuppgifter")} {...stepProps("details")}>
        <BookFields {...props} cover={publishing.cover} choices={choices} setChoices={setChoices} />
      </StepBox>
      <StepBox number={3} label={t("Exportera")} {...stepProps("export")}>
        <ExportStep {...props} choices={choices} setChoices={setChoices} />
      </StepBox>
    </>
  );
}

function PublishPreview({ props, publishing }: { props: PublishProps; publishing: Publishing }) {
  const { choices } = publishing;
  if (publishing.step === "design") {
    return <PrintPreview project={props.project} generalAuthor={props.generalAuthor} />;
  }
  return (
    <Preview
      {...props}
      isEbook={choices.format === "ebok"}
      isPrint={choices.format === "tryck"}
      coverUrl={publishing.cover.url}
    />
  );
}

export function PublishView(props: PublishProps) {
  const publishing = usePublishing(props);
  const { choices, exporter } = publishing;
  const exportLabel = FORMATS.find(([id]) => id === choices.format)?.[2] ?? t("Exportera");
  return (
    <div className="publish">
      <aside className="publish-steps" aria-label={t("Publicera")}>
        <button className="link-button quiet publish-back" onClick={props.onBack}>
          {t("← Tillbaka till texten")}
        </button>
        <Steps props={props} publishing={publishing} />
        <button
          className="button primary publish-button"
          disabled={exporter.state.kind === "running"}
          onClick={() => exporter.run(choices)}
        >
          {exportLabel}
        </button>
      </aside>
      <main className="publish-preview">
        <PublishPreview props={props} publishing={publishing} />
      </main>
      <ExportStatus exporter={exporter} onOpenScene={props.onOpenScene} />
    </div>
  );
}
