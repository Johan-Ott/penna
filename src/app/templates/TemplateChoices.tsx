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

/** Börja från: one structure, built in or the writer's own, and any pieces on top. */
export function TemplateChoices(props: Props) {
  const { own, reload } = useOwnTemplates(props.libraryDir);
  const [problem, setProblem] = useState("");
  const importOne = () =>
    void importTemplateFile(props.libraryDir)
      .then(() => (setProblem(""), reload()))
      .catch((error: unknown) =>
        setProblem(error instanceof Error ? error.message : String(error)),
      );
  return (
    <>
      <span className="field-label">{t("Börja från")}</span>
      <StructureList {...props} own={own} />
      <span className="field-label">{t("Lägg till bitar")}</span>
      <PieceToggles
        chosen={props.details.pieces}
        onChange={(pieces) => props.onChange({ ...props.details, pieces })}
      />
      <button className="link-button quiet" onClick={importOne}>
        {t("Importera mall…")}
      </button>
      {problem && <span className="setting-hint">{problem}</span>}
    </>
  );
}
