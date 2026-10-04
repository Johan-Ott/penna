import {
  BODY_FONTS,
  BODY_SIZES,
  BOOK_THEMES,
  SCENE_BREAKS,
  TRIMS,
  type BookDesign,
  type BookTheme,
} from "../../export/bookDesign.js";
import { t } from "../../i18n/i18n.js";
import { Switch } from "../settings/controls.js";

type ControlProps = { design: BookDesign; save: (change: Partial<BookDesign>) => void };

const THEME_NAMES: Record<BookTheme, string> = {
  klassisk: t("Klassisk"),
  modern: t("Modern"),
  luftig: t("Luftig"),
};

const sizeLabel = (size: number) => `${String(size).replace(".", ",")} pt`;

// Each theme card shows "Aa" in the theme's heading type, as in the design.
function ThemeCards({ design, save }: ControlProps) {
  return (
    <div className="design-block">
      <span className="design-label">{t("Tema")}</span>
      <div className="theme-cards" role="radiogroup" aria-label={t("Tema")}>
        {BOOK_THEMES.map((theme) => (
          <button
            key={theme}
            role="radio"
            aria-checked={design.theme === theme}
            className={`theme-card ${theme}`}
            onClick={() => save({ theme })}
          >
            <span className="theme-sample">Aa</span>
            {THEME_NAMES[theme]}
          </button>
        ))}
      </div>
    </div>
  );
}

// A row with the value on the right, which opens a list to choose from.
function SelectRow(props: {
  label: string;
  value: string;
  options: [string, string][];
  onSelect: (value: string) => void;
}) {
  return (
    <label className="design-row">
      <span>{props.label}</span>
      <select
        className="design-select"
        value={props.value}
        onChange={(event) => props.onSelect(event.target.value)}
      >
        {props.options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

// Brödtext is one choice of typeface and size, shown as "Literata · 10,5 pt".
const BODY_CHOICES: [string, string][] = BODY_FONTS.flatMap((font) =>
  BODY_SIZES.map((size): [string, string] => [`${font}|${size}`, `${font} · ${sizeLabel(size)}`]),
);

function SceneBreaks({ design, save }: ControlProps) {
  return (
    <div className="design-block">
      <span className="design-label">{t("Scenbrytning")}</span>
      <div className="break-choices" role="radiogroup" aria-label={t("Scenbrytning")}>
        {SCENE_BREAKS.map((mark) => (
          <button
            key={mark}
            role="radio"
            aria-checked={design.sceneBreak === mark}
            onClick={() => save({ sceneBreak: mark })}
          >
            {mark}
          </button>
        ))}
      </div>
    </div>
  );
}

function DropCapRow({ design, save }: ControlProps) {
  return (
    <div className="design-row">
      <span>{t("Anfang vid kapitelstart")}</span>
      <Switch
        label={t("Anfang")}
        isOn={design.dropCap}
        onFlip={() => save({ dropCap: !design.dropCap })}
      />
    </div>
  );
}

/** The book's look: theme, format, body text, anfang and scene break. */
export function DesignControls({ design, save }: ControlProps) {
  const chooseBody = (choice: string) => {
    const [bodyFont = design.bodyFont, size] = choice.split("|");
    save({ bodyFont, bodySize: Number(size) });
  };
  return (
    <>
      <ThemeCards design={design} save={save} />
      <SelectRow
        label={t("Format")}
        value={design.trim}
        options={TRIMS}
        onSelect={(trim) => save({ trim })}
      />
      <SelectRow
        label={t("Brödtext")}
        value={`${design.bodyFont}|${design.bodySize}`}
        options={BODY_CHOICES}
        onSelect={chooseBody}
      />
      <DropCapRow design={design} save={save} />
      <SceneBreaks design={design} save={save} />
    </>
  );
}
