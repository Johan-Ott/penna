import { useState } from "react";
import {
  OPENING_PRESETS,
  templateFrom,
  withTemplate,
  type OpeningTemplate,
} from "../../export/openings.js";
import { useMenuButton } from "../Menu.js";
import type { ControlProps } from "./HeadingControls.js";
import { OpeningEditor } from "./OpeningEditor.js";
import { t } from "../../i18n/i18n.js";

const PRESET_NAMES: Record<string, string> = {
  klassisk: t("Klassisk"),
  ornament: t("Ornament"),
  "bild-overst": t("Bild överst"),
  "bild-kanten": t("Bild i kanten"),
};

function NewTemplateButton({
  design,
  save,
  onCreated,
}: ControlProps & { onCreated: (template: OpeningTemplate) => void }) {
  const items = OPENING_PRESETS.map((preset) => ({
    label: PRESET_NAMES[preset.id] ?? preset.name,
    onSelect: () => {
      const named = { ...preset, name: PRESET_NAMES[preset.id] ?? preset.name };
      const created = templateFrom(named, design.openings);
      save({ openings: [...design.openings, created] });
      onCreated(created);
    },
  }));
  const menu = useMenuButton(t("Ny mall"), items);
  return (
    <>
      <button className="button secondary small" onClick={menu.open}>
        {t("+ Ny mall")}
      </button>
      {menu.menu}
    </>
  );
}

type RowProps = ControlProps & {
  template: OpeningTemplate;
  onEdit: () => void;
  onRemove: () => void;
};

function TemplateMenu(props: RowProps) {
  const { design, save, template } = props;
  const items = [
    { label: t("Redigera…"), onSelect: props.onEdit },
    ...(design.opening === template.id
      ? []
      : [{ label: t("Gör till standard"), onSelect: () => save({ opening: template.id }) }]),
    {
      label: t("Duplicera"),
      onSelect: () =>
        save({ openings: [...design.openings, templateFrom(template, design.openings)] }),
    },
    // A book always keeps one template.
    ...(design.openings.length > 1
      ? [{ label: t("Ta bort"), separatorBefore: true, onSelect: props.onRemove }]
      : []),
  ];
  const menu = useMenuButton(t("Mallens meny"), items);
  return (
    <>
      <button className="book-menu" aria-label={t("Mallens meny")} onClick={menu.open}>
        ⋯
      </button>
      {menu.menu}
    </>
  );
}

function TemplateRow(props: RowProps) {
  const isStandard = props.design.opening === props.template.id;
  return (
    <div className="design-row opening-row">
      <button className="opening-name" onClick={props.onEdit}>
        {props.template.name}
      </button>
      <span className="opening-row-end">
        {isStandard && <span className="setting-hint">{t("Standard")}</span>}
        <TemplateMenu {...props} />
      </span>
    </div>
  );
}

// The editor works on a draft, saved once when it closes rather than on every drag.
function useDraft({ design, save }: ControlProps) {
  const [draft, setDraft] = useState<OpeningTemplate | null>(null);
  const edit = (id: string) => setDraft(design.openings.find((shown) => shown.id === id) ?? null);
  const close = () => {
    if (draft) save({ openings: withTemplate(design.openings, draft) });
    setDraft(null);
  };
  const remove = (id: string) => {
    const openings = design.openings.filter((shown) => shown.id !== id);
    save({ openings, opening: design.opening === id ? (openings[0]?.id ?? "") : design.opening });
    setDraft(null);
  };
  return { draft, setDraft, edit, close, remove };
}

/** The book's chapter openings: the standard one, and others that chapters can pick. */
export function OpeningList(props: ControlProps) {
  const { design } = props;
  const { draft, setDraft, edit, close, remove } = useDraft(props);
  return (
    <>
      {design.openings.map((shown) => (
        <TemplateRow
          key={shown.id}
          {...props}
          template={shown}
          onEdit={() => edit(shown.id)}
          onRemove={() => remove(shown.id)}
        />
      ))}
      <NewTemplateButton {...props} onCreated={setDraft} />
      {draft && (
        <OpeningEditor
          design={design}
          template={draft}
          dir={props.dir}
          onChange={setDraft}
          canRemove={design.openings.length > 1}
          onRemove={() => remove(draft.id)}
          onClose={close}
        />
      )}
    </>
  );
}
