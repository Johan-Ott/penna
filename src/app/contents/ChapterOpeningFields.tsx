import type { BookDesign } from "../../export/bookDesign.js";
import { openingFor, type ChapterOpening } from "../../export/openings.js";
import { PictureRow } from "../bookdesign/PictureRow.js";
import { Dropdown } from "../controls.js";
import { t } from "../../i18n/i18n.js";

/** The chapter's choice: "" for the book's standard template, and its own pictures by area. */
export interface OpeningChoice {
  opening: string;
  pictures: Record<string, string>;
}

/** Only the pictures the chosen template has room for, and nothing left empty. */
export function chapterOpeningOf(design: BookDesign, choice: OpeningChoice): ChapterOpening {
  const template = openingFor(design.openings, design.opening, choice);
  const pictures = Object.fromEntries(
    template.areas.flatMap((area) =>
      choice.pictures[area.id] ? [[area.id, choice.pictures[area.id]]] : [],
    ),
  );
  return {
    opening: choice.opening || undefined,
    pictures: Object.keys(pictures).length ? pictures : undefined,
  } as ChapterOpening;
}

function TemplateChoice({ design, choice, onChange }: FieldsProps) {
  const standard = openingFor(design.openings, design.opening, {});
  const options: [string, string][] = [
    ["", t("Som boken ({name})", { name: standard.name })],
    ...design.openings.map((shown): [string, string] => [shown.id, shown.name]),
  ];
  return (
    <div className="design-row">
      <span className="field-label">{t("Kapitelöppning")}</span>
      <Dropdown
        label={t("Kapitelöppning")}
        value={choice.opening}
        options={options}
        onSelect={(opening) => onChange({ ...choice, opening })}
      />
    </div>
  );
}

type FieldsProps = {
  design: BookDesign;
  dir: string;
  choice: OpeningChoice;
  onChange: (choice: OpeningChoice) => void;
};

/** Which template the chapter opens with, and a picture of its own in each of its areas. */
export function ChapterOpeningFields(props: FieldsProps) {
  const { design, choice } = props;
  const template = openingFor(design.openings, design.opening, choice);
  const setPicture = (id: string) => (name: string) =>
    props.onChange({ ...choice, pictures: { ...choice.pictures, [id]: name } });
  return (
    <>
      <TemplateChoice {...props} />
      {template.areas.map((area, index) => (
        <PictureRow
          key={area.id}
          dir={props.dir}
          label={t("Bild {number}", { number: index + 1 })}
          name={choice.pictures[area.id] || area.picture}
          removeLabel={choice.pictures[area.id] ? t("Som mallen") : null}
          onChange={setPicture(area.id)}
        />
      ))}
    </>
  );
}
