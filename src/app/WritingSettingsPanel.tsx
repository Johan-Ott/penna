import {
  changeSize,
  nextLineHeight,
  nextWidth,
  toggleDark,
  type FocusMode,
  type ProseFont,
  type WritingSettings,
} from "../editor/writingSettings.js";
import type { SettingsChange } from "./useWritingSettings.js";
import { t } from "../i18n/i18n.js";

type Switch = "typewriter" | "indent";

const changeTo =
  (changes: Partial<WritingSettings>): SettingsChange =>
  (current) => ({ ...current, ...changes });
const toggle =
  (key: Switch): SettingsChange =>
  (current) => ({ ...current, [key]: !current[key] });
const cycleLineHeight: SettingsChange = (current) => ({
  ...current,
  lineHeight: nextLineHeight(current.lineHeight),
});
const cycleWidth: SettingsChange = (current) => ({ ...current, width: nextWidth(current.width) });

interface PanelProps {
  settings: WritingSettings;
  onChange: (change: SettingsChange) => void;
  /** Focus and typewriter only act in the focus mode, so they are shown only there. */
  showsFocusOptions: boolean;
}

const WIDTH_LABELS = { smal: t("Smal"), normal: t("Normal"), bred: t("Bred") } as const;

function Segmented<T extends string>(props: {
  label: string;
  value: T;
  options: [T, string][];
  onSelect: (value: T) => void;
}) {
  return (
    <div className="setting-column">
      <span className="setting-label">{props.label}</span>
      <div className="segmented" role="radiogroup" aria-label={props.label}>
        {props.options.map(([value, text]) => (
          <button
            key={value}
            role="radio"
            aria-checked={value === props.value}
            onClick={() => props.onSelect(value)}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

function Toggle(props: { label: string; hint: string; isOn: boolean; onFlip: () => void }) {
  return (
    <div className="setting-row">
      <span className="setting-text">
        <span>{props.label}</span>
        <span className="setting-hint">{props.hint}</span>
      </span>
      <button
        className="toggle"
        role="switch"
        aria-checked={props.isOn}
        aria-label={props.label}
        onClick={props.onFlip}
      >
        <span />
      </button>
    </div>
  );
}

function ValueRow(props: { label: string; value: string; onNext: () => void }) {
  return (
    <div className="setting-row">
      <span>{props.label}</span>
      <button className="setting-value" onClick={props.onNext}>
        {props.value}
      </button>
    </div>
  );
}

function SizeStepper({ settings, onChange }: Pick<PanelProps, "settings" | "onChange">) {
  return (
    <div className="setting-row">
      <span>{t("Storlek")}</span>
      <span className="stepper">
        <button
          aria-label={t("Mindre")}
          onClick={() => onChange((current) => changeSize(current, -1))}
        >
          –
        </button>
        <span>{settings.size}</span>
        <button
          aria-label={t("Större")}
          onClick={() => onChange((current) => changeSize(current, 1))}
        >
          +
        </button>
      </span>
    </div>
  );
}

function TypographySettings({ settings, onChange }: PanelProps) {
  const set = (changes: Partial<WritingSettings>) => onChange(changeTo(changes));
  const fonts: [ProseFont, string][] = [
    ["serif", "Serif"],
    ["sans", "Sans"],
    ["mono", "Mono"],
  ];
  return (
    <>
      <Segmented
        label={t("Typsnitt")}
        value={settings.font}
        options={fonts}
        onSelect={(font) => set({ font })}
      />
      <SizeStepper settings={settings} onChange={onChange} />
      <ValueRow
        label={t("Radavstånd")}
        value={String(settings.lineHeight).replace(".", ",")}
        onNext={() => onChange(cycleLineHeight)}
      />
      <ValueRow
        label={t("Textbredd")}
        value={WIDTH_LABELS[settings.width]}
        onNext={() => onChange(cycleWidth)}
      />
    </>
  );
}

function FocusSettings({ settings, onChange }: PanelProps) {
  const set = (changes: Partial<WritingSettings>) => onChange(changeTo(changes));
  const modes: [FocusMode, string][] = [
    ["av", t("Av")],
    ["mening", t("Mening")],
    ["stycke", t("Stycke")],
  ];
  return (
    <>
      <Segmented
        label={t("Fokus")}
        value={settings.focus}
        options={modes}
        onSelect={(focus) => set({ focus })}
      />
      <Toggle
        label={t("Typewriter")}
        hint={t("Raden du skriver stannar mitt på skärmen")}
        isOn={settings.typewriter}
        onFlip={() => onChange(toggle("typewriter"))}
      />
    </>
  );
}

export function WritingSettingsPanel(props: PanelProps) {
  const { settings, onChange } = props;
  return (
    <div className="settings-panel" role="dialog" aria-label={t("Skrivinställningar")}>
      <TypographySettings {...props} />
      <div className="settings-divider" />
      {props.showsFocusOptions && <FocusSettings {...props} />}
      <Toggle
        label={t("Indrag första rad")}
        hint={t("Bokstil: inget indrag efter rubrik")}
        isOn={settings.indent}
        onFlip={() => onChange(toggle("indent"))}
      />
      <Toggle
        label={t("Mörkt tema")}
        hint={t("Följer annars systemet")}
        isOn={settings.theme === "mörkt"}
        onFlip={() => onChange(toggleDark)}
      />
    </div>
  );
}
