import { useState } from "react";
import type { ProjectDetails } from "../../project/newProject.js";
import { structures, templatePieces, type BookTemplate } from "../../project/templates.js";
import { importTemplateFile, useOwnTemplates } from "./templateFiles.js";
import { t } from "../../i18n/i18n.js";

type Props = {
  details: ProjectDetails;
  onChange: (details: ProjectDetails) => void;
  libraryDir: string | null;
};

function StructureList(props: Props & { own: BookTemplate[] }) {
  const { details, onChange } = props;
  return (
    <div className="template-list" role="radiogroup" aria-label={t("Struktur")}>
      {[...structures(), ...props.own].map((structure) => (
        <button
          key={structure.id}
          role="radio"
          className="template-choice"
          aria-checked={details.structure === structure.id}
          onClick={() => onChange({ ...details, structure: structure.id })}
        >
          <span className="template-name">{structure.name}</span>
          <span className="choice-hint">{structure.hint || t("Din egen mall")}</span>
        </button>
      ))}
    </div>
  );
}

/** Pieces to add to the structure, as many as the book needs. */
export function PieceToggles(props: { chosen: string[]; onChange: (pieces: string[]) => void }) {
  const flip = (id: string) =>
    props.onChange(
      props.chosen.includes(id)
        ? props.chosen.filter((each) => each !== id)
        : [...props.chosen, id],
    );
  return (
    <div className="chip-row piece-row" aria-label={t("Bitar")}>
      {templatePieces().map((piece) => (
        <button
          key={piece.id}
          className="chip"
          aria-pressed={props.chosen.includes(piece.id)}
          title={piece.hint}
          onClick={() => flip(piece.id)}
        >
          {piece.name}
        </button>
      ))}
    </div>
  );
}

function Suggested(props: { structure: BookTemplate | undefined; onSwap: () => void }) {
  return (
    <div className="template-choice suggested">
      <span className="template-name">{props.structure?.name}</span>
      <span className="choice-hint">{props.structure?.hint || t("Din egen mall")}</span>
      <button className="link-button" onClick={props.onSwap}>
        {t("Byt struktur")}
      </button>
    </div>
  );
}

function ImportLink(props: { libraryDir: string | null; onImported: () => void }) {
  const [problem, setProblem] = useState("");
  const importOne = () =>
    void importTemplateFile(props.libraryDir)
      .then(() => (setProblem(""), props.onImported()))
      .catch((error: unknown) =>
        setProblem(error instanceof Error ? error.message : String(error)),
      );
  return (
    <>
      <button className="link-button quiet" onClick={importOne}>
        {t("Importera mall…")}
      </button>
      {problem && <span className="setting-hint">{problem}</span>}
    </>
  );
}

/** Vårt förslag: the structure Penna suggests, or another one, and the pieces on top. */
export function TemplateSuggestion(props: Props) {
  const { own, reload } = useOwnTemplates(props.libraryDir);
  const [isSwapping, setSwapping] = useState(false);
  const structure = [...structures(), ...own].find((each) => each.id === props.details.structure);
  const choose = (details: ProjectDetails) => (setSwapping(false), props.onChange(details));
  return (
    <>
      <span className="field-label">{t("Struktur")}</span>
      {isSwapping ? (
        <StructureList {...props} onChange={choose} own={own} />
      ) : (
        <Suggested structure={structure} onSwap={() => setSwapping(true)} />
      )}
      <span className="field-label">{t("Bitar")}</span>
      <PieceToggles
        chosen={props.details.pieces}
        onChange={(pieces) => props.onChange({ ...props.details, pieces })}
      />
      <ImportLink libraryDir={props.libraryDir} onImported={() => (setSwapping(true), reload())} />
    </>
  );
}
