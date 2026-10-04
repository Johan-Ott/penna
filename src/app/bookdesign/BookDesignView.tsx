import {
  BODY_FONTS,
  BODY_SIZES,
  designOf,
  SCENE_BREAKS,
  TRIMS,
  type BookDesign,
} from "../../export/bookDesign.js";
import { Choice, Row, Switch } from "../settings/controls.js";
import type { Project } from "../useProject.js";
import { PrintPreview } from "./PrintPreview.js";

interface BookDesignProps {
  project: Project;
  generalAuthor: string;
  onSaveFields: (fields: Record<string, unknown>) => void;
}

// What each style looks like in Klassisk, as the design describes them.
const STYLES: [string, string][] = [
  ["Brödtext", "Indrag"],
  ["Brev", "Kursiv, indragen"],
  ["Citat", "Indragen"],
  ["Dikt", "Radbrytningar behålls"],
  ["Meddelande", "Sans, mindre"],
];

const sizeLabel = (size: number) => `${String(size).replace(".", ",")} pt`;

type ControlProps = { design: BookDesign; save: (change: Partial<BookDesign>) => void };

function BodyText({ design, save }: ControlProps) {
  return (
    <Row label="Brödtext" hint={`${design.bodyFont} · ${sizeLabel(design.bodySize)}`}>
      <Choice
        label="Typsnitt"
        value={design.bodyFont}
        options={BODY_FONTS.map((font) => [font, font])}
        onSelect={(bodyFont) => save({ bodyFont })}
      />
      <Choice
        label="Storlek"
        value={String(design.bodySize)}
        options={BODY_SIZES.map((size) => [String(size), sizeLabel(size)])}
        onSelect={(size) => save({ bodySize: Number(size) })}
      />
    </Row>
  );
}

function SceneBreakRow({ design, save }: ControlProps) {
  return (
    <Row label="Scenbrytning">
      <Choice
        label="Scenbrytning"
        value={design.sceneBreak}
        options={SCENE_BREAKS.map((mark) => [mark, mark])}
        onSelect={(sceneBreak) => save({ sceneBreak })}
      />
    </Row>
  );
}

// v1 has one theme; more come later, as the spec says.
const ThemeRow = () => (
  <Row label="Tema" hint="Klassisk. Fler teman kommer senare.">
    <span className="theme-card chosen">
      <span className="theme-sample">Aa</span>
      Klassisk
    </span>
  </Row>
);

function DesignControls({ design, save }: ControlProps) {
  return (
    <>
      <ThemeRow />
      <Row label="Format">
        <Choice
          label="Format"
          value={design.trim}
          options={TRIMS}
          onSelect={(trim) => save({ trim })}
        />
      </Row>
      <BodyText design={design} save={save} />
      <Row label="Anfang vid kapitelstart">
        <Switch
          label="Anfang"
          isOn={design.dropCap}
          onFlip={() => save({ dropCap: !design.dropCap })}
        />
      </Row>
      <SceneBreakRow design={design} save={save} />
    </>
  );
}

function StyleList() {
  return (
    <section className="design-styles">
      <span className="export-heading">Stilar i manuset</span>
      <span className="setting-hint">
        Märk upp text när du skriver. Utseendet bestäms här, för hela boken.
      </span>
      {STYLES.map(([name, look]) => (
        <span key={name} className="design-style">
          <span>{name}</span>
          <span className="setting-hint">{look}</span>
        </span>
      ))}
    </section>
  );
}

/** Bokdesign, as in the design: the book's look on the left, its first pages on the right. */
export function BookDesignView({ project, generalAuthor, onSaveFields }: BookDesignProps) {
  const design = designOf(project.fields);
  const save = (change: Partial<BookDesign>) => onSaveFields({ design: { ...design, ...change } });
  return (
    <main className="design-view">
      <header className="toolbar">
        <span className="toolbar-title">Bokdesign</span>
      </header>
      <div className="design-columns">
        <div className="design-settings">
          <DesignControls design={design} save={save} />
          <StyleList />
        </div>
        <PrintPreview project={project} generalAuthor={generalAuthor} />
      </div>
    </main>
  );
}
