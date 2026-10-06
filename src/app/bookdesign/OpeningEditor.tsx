import { useState } from "react";
import type { BookDesign } from "../../export/bookDesign.js";
import {
  AREA_PLACES,
  newArea,
  touchesEdge,
  type HeadingAlign,
  type OpeningTemplate,
  type PictureArea,
  type PictureFit,
} from "../../export/openings.js";
import { Choice, Dialog } from "../controls.js";
import { OpeningCanvas } from "./OpeningCanvas.js";
import { PictureRow } from "./PictureRow.js";
import { t } from "../../i18n/i18n.js";

const ALIGN_CHOICES: [HeadingAlign, string][] = [
  ["mitten", t("Mitten")],
  ["vanster", t("Vänster")],
];
const FIT_CHOICES: [PictureFit, string][] = [
  ["fyll", t("Fyll ytan")],
  ["hela", t("Hela bilden")],
];
const PLACE_NAMES: Record<string, string> = {
  "Hela toppen": t("Hela toppen"),
  "Hela sidan": t("Hela sidan"),
  "Längs kanten": t("Längs kanten"),
  Ornament: t("Ornament"),
};

type EditorProps = {
  design: BookDesign;
  template: OpeningTemplate;
  dir: string;
  onChange: (template: OpeningTemplate) => void;
};

function PlaceButtons({ onPlace }: { onPlace: (rect: Partial<PictureArea>) => void }) {
  return (
    <div className="opening-places">
      {AREA_PLACES.map((place) => (
        <button
          key={place.name}
          className="button secondary small"
          onClick={() => onPlace(place.rect)}
        >
          {PLACE_NAMES[place.name] ?? place.name}
        </button>
      ))}
    </div>
  );
}

function AreaPanel(props: EditorProps & { area: PictureArea; onRemove: () => void }) {
  const { area, template } = props;
  const change = (next: Partial<PictureArea>) =>
    props.onChange({
      ...template,
      areas: template.areas.map((shown) => (shown.id === area.id ? { ...area, ...next } : shown)),
    });
  return (
    <div className="opening-panel-group">
      <span className="design-section">{t("Bildytan")}</span>
      <PictureRow
        dir={props.dir}
        label={t("Bild")}
        name={area.picture}
        onChange={(picture) => change({ picture })}
      />
      <Choice
        label={t("Bildens passform")}
        value={area.fit}
        options={FIT_CHOICES}
        onSelect={(fit) => change({ fit })}
      />
      <PlaceButtons onPlace={change} />
      <button className="link-button quiet" onClick={props.onRemove}>
        {t("Ta bort bildytan")}
      </button>
    </div>
  );
}

function TemplatePanel(props: EditorProps & { onAdd: () => void }) {
  const { template } = props;
  return (
    <div className="opening-panel-group">
      <input
        className="opening-title"
        aria-label={t("Mallens namn")}
        value={template.name}
        onChange={(event) => props.onChange({ ...template, name: event.target.value })}
      />
      <div className="design-row">
        <span>{t("Rubriken")}</span>
        <Choice
          label={t("Rubriken")}
          value={template.headingAlign}
          options={ALIGN_CHOICES}
          onSelect={(headingAlign) => props.onChange({ ...template, headingAlign })}
        />
      </div>
      <button className="button secondary small" onClick={props.onAdd}>
        {t("+ Bildyta")}
      </button>
      {template.areas.some((shown) => shown.picture && touchesEdge(shown)) && (
        <span className="setting-hint">
          {t("En bild når papperets kant, så tryck-PDF:en får 3 mm utfall.")}
        </span>
      )}
    </div>
  );
}

function EditorActions(props: { canRemove: boolean; onRemove: () => void; onClose: () => void }) {
  return (
    <div className="dialog-actions">
      {props.canRemove && (
        <button className="button ghost push-left" onClick={props.onRemove}>
          {t("Ta bort mallen")}
        </button>
      )}
      <button className="button primary" onClick={props.onClose}>
        {t("Klar")}
      </button>
    </div>
  );
}

/** Draw a chapter opening: picture areas anywhere on the page, and where the heading sits. */
export function OpeningEditor(
  props: EditorProps & { canRemove: boolean; onRemove: () => void; onClose: () => void },
) {
  const { template } = props;
  const [selected, setSelected] = useState<string | null>(null);
  const area = template.areas.find((shown) => shown.id === selected);
  const add = () => {
    const created = newArea(template);
    props.onChange({ ...template, areas: [...template.areas, created] });
    setSelected(created.id);
  };
  const removeArea = (id: string) =>
    props.onChange({ ...template, areas: template.areas.filter((shown) => shown.id !== id) });
  const actions = (
    <EditorActions canRemove={props.canRemove} onRemove={props.onRemove} onClose={props.onClose} />
  );
  return (
    <Dialog label={t("Kapitelöppning")} className="opening-dialog" onClose={props.onClose}>
      <div className="opening-editor">
        <OpeningCanvas {...props} selected={selected} onSelect={setSelected} />
        <div className="opening-panel">
          <TemplatePanel {...props} onAdd={add} />
          {area && <AreaPanel {...props} area={area} onRemove={() => removeArea(area.id)} />}
        </div>
      </div>
      {actions}
    </Dialog>
  );
}
