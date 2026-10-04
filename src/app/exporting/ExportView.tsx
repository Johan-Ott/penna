import { useState } from "react";
import type { Typography } from "../../export/book.js";
import { bookLanguage, quoteStyleFor } from "../../project/bookLanguage.js";
import { Choice } from "../settings/controls.js";
import type { Project } from "../useProject.js";
import { ExportStatus, Preview } from "./ExportPanels.js";
import { BookFields } from "./BookFields.js";
import { useCover } from "./useCover.js";
import { FILE_KINDS, useExport, type ExportChoices, type ExportFormat } from "./useExport.js";

interface ExportViewProps {
  project: Project;
  generalAuthor: string;
  onSaveFields: (fields: Record<string, unknown>) => void;
  onOpenScene: (title: string) => void;
}

const FORMATS: [ExportFormat, string, string][] = [
  [
    "manus",
    "Standardmanus",
    "Till förlag och agenter. 12 pt, dubbelt radavstånd, namn och titel i sidhuvudet.",
  ],
  ["ebok", "E-bok", "EPUB 3 med omslag och innehållsförteckning, redo för e-bokhandlare."],
  ["tryck", "Tryck-PDF", "Satt enligt Bokdesign, för tryck på beställning."],
];

const TYPOGRAPHY: [Typography, string][] = [
  ["svensk", "Svensk"],
  ["engelsk", "Engelsk"],
];

function Formats({
  value,
  onChange,
}: {
  value: ExportFormat;
  onChange: (format: ExportFormat) => void;
}) {
  return (
    <fieldset className="export-formats">
      <legend>Format</legend>
      {FORMATS.map(([format, title, description]) => (
        <button
          key={title}
          className="export-format"
          aria-pressed={format === value}
          onClick={() => onChange(format)}
        >
          <span className="export-format-title">{title}</span>
          <span className="setting-hint">{description}</span>
        </button>
      ))}
    </fieldset>
  );
}

function TypographyChoice({
  value,
  onChange,
}: {
  value: Typography;
  onChange: (value: Typography) => void;
}) {
  const hint =
    value === "svensk"
      ? "Talstreck i repliker och ”svenska citattecken”, som i manuset."
      : "“Engelska citattecken”. Talstrecken behålls.";
  return (
    <div className="export-group">
      <span className="export-heading">Typografi</span>
      <Choice label="Typografi" value={value} options={TYPOGRAPHY} onSelect={onChange} />
      <span className="setting-hint">{hint}</span>
    </div>
  );
}

function ExportHeader(props: { format: ExportFormat; isRunning: boolean; onExport: () => void }) {
  const { isRunning, onExport } = props;
  return (
    <header className="toolbar">
      <span className="toolbar-title">Exportera</span>
      <button className="button primary small" disabled={isRunning} onClick={onExport}>
        {isRunning
          ? "Exporterar…"
          : `Exportera ${FILE_KINDS[props.format].extension.toUpperCase()}`}
      </button>
    </header>
  );
}

// The quotes start as the book's language writes them; the writer can still pick the other.
const startChoices = (project: Project): ExportChoices => ({
  format: "manus",
  typography: quoteStyleFor(bookLanguage(project.fields)),
  hasTitlePage: true,
  hasCopyrightPage: true,
  hasContents: true,
  hasDedication: false,
  hasThanks: false,
  hasAbout: true,
});

function Backup({ onBackup }: { onBackup: () => void }) {
  return (
    <div className="export-backup">
      <span className="export-heading">Säkerhetskopia</span>
      <span className="setting-hint">
        Hela projektmappen som en zip-fil, med ögonblicksbilder och kommentarer.
      </span>
      <button className="button secondary small" onClick={onBackup}>
        Spara som zip…
      </button>
    </div>
  );
}

function FormatColumn(props: {
  choices: ExportChoices;
  setChoices: (next: ExportChoices) => void;
  onBackup: () => void;
}) {
  const { choices, setChoices } = props;
  return (
    <div className="export-column">
      <Formats value={choices.format} onChange={(format) => setChoices({ ...choices, format })} />
      <TypographyChoice
        value={choices.typography}
        onChange={(typography) => setChoices({ ...choices, typography })}
      />
      <Backup onBackup={props.onBackup} />
    </div>
  );
}

/** Exportera, as in the design: format and typography, the book's details, a preview. */
export function ExportView(props: ExportViewProps) {
  const [choices, setChoices] = useState(() => startChoices(props.project));
  const exporter = useExport(props.project, props.generalAuthor, props.onSaveFields);
  const { state, run, reset } = exporter;
  const cover = useCover(props.project);
  return (
    <main className="export-view">
      <ExportHeader
        format={choices.format}
        isRunning={state.kind === "running"}
        onExport={() => run(choices)}
      />
      <div className="export-columns">
        <FormatColumn choices={choices} setChoices={setChoices} onBackup={exporter.backup} />
        <BookFields {...props} cover={cover} choices={choices} setChoices={setChoices} />
        <Preview
          {...props}
          isEbook={choices.format === "ebok"}
          isPrint={choices.format === "tryck"}
          coverUrl={cover.url}
        />
      </div>
      <ExportStatus state={state} onOpenScene={props.onOpenScene} onClose={reset} />
    </main>
  );
}
