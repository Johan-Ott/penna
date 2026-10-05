import {
  changeSize,
  REPEAT_WINDOWS,
  type ProseFont,
  type WritingSettings,
} from "../../editor/writingSettings.js";
import type { AppPreferences } from "../appPreferences.js";
import type { PreferenceChange } from "../useStartup.js";
import type { SettingsChange } from "../useWritingSettings.js";
import { Choice, Row, Switch } from "./controls.js";
import type { DriveSync } from "../useDriveSync.js";
import { t } from "../../i18n/i18n.js";

export interface TabProps {
  preferences: AppPreferences;
  updatePreferences: (change: PreferenceChange) => void;
  settings: WritingSettings;
  onChangeSettings: (change: SettingsChange) => void;
  /** Null on the bookshelf. */
  book: {
    language: string;
    onChangeLanguage: (language: string) => void;
    onExportZip: () => void;
    drive: DriveSync;
  } | null;
}

const FONTS: [ProseFont, string][] = [
  ["serif", "Serif"],
  ["sans", "Sans"],
  ["mono", "Mono"],
];

function SizeStepper({ settings, onChangeSettings }: TabProps) {
  const step = (direction: 1 | -1) => () =>
    onChangeSettings((current) => changeSize(current, direction));
  return (
    <span className="stepper">
      <button aria-label={t("Mindre")} onClick={step(-1)}>
        –
      </button>
      <span>{settings.size}</span>
      <button aria-label={t("Större")} onClick={step(1)}>
        +
      </button>
    </span>
  );
}

type EditorSwitch = "typewriter" | "spellcheck" | "typography" | "review";
const EDITOR_SWITCHES: [EditorSwitch, string, string][] = [
  [
    "typewriter",
    t("Typewriter-läge"),
    t("Raden du skriver på stannar mitt på skärmen i fokusläget."),
  ],
  ["spellcheck", t("Stavningskontroll"), t("Systemets ordlista stryker under felstavade ord.")],
  [
    "typography",
    t("Svensk typografi medan du skriver"),
    'Två bindestreck blir talstreck och "citat" blir ”citat”.',
  ],
  ["review", t("Granskning"), t("Namnstavning och upprepningar, i texten och i en panel bredvid.")],
];

const WINDOWS = REPEAT_WINDOWS.map((sentences): [string, string] => [
  String(sentences),
  String(sentences),
]);

function RepeatWindowRow({ settings, onChangeSettings }: TabProps) {
  return (
    <Row
      label={t("Upprepningsfönster")}
      hint={t("Hur många meningar som ska skilja samma ord åt.")}
    >
      <Choice
        label={t("Upprepningsfönster")}
        value={String(settings.repeatWindow)}
        options={WINDOWS}
        onSelect={(value) =>
          onChangeSettings((current) => ({ ...current, repeatWindow: Number(value) }))
        }
      />
    </Row>
  );
}

function SwitchRows({ settings, onChangeSettings }: TabProps) {
  return EDITOR_SWITCHES.map(([key, label, hint]) => (
    <Row key={key} label={label} hint={hint}>
      <Switch
        label={label}
        isOn={settings[key]}
        onFlip={() => onChangeSettings((current) => ({ ...current, [key]: !current[key] }))}
      />
    </Row>
  ));
}

export function EditorTab(props: TabProps) {
  const { settings, onChangeSettings } = props;
  return (
    <>
      <Row label={t("Typsnitt")} hint={t("Bara för skrivandet. Boken formges i Bokdesign.")}>
        <Choice
          label={t("Typsnitt")}
          value={settings.font}
          options={FONTS}
          onSelect={(font) => onChangeSettings((current) => ({ ...current, font }))}
        />
      </Row>
      <Row
        label={t("Textstorlek")}
        hint={t("Ctrl och plus eller minus ändrar den medan du skriver.")}
      >
        <SizeStepper {...props} />
      </Row>
      <SwitchRows {...props} />
      <RepeatWindowRow {...props} />
    </>
  );
}

export function VersionsTab({ preferences, updatePreferences, book }: TabProps) {
  return (
    <>
      <Row label={t("Automatiska versioner")} hint={t("Sparas när en text har ändrats mycket.")}>
        <Switch
          label={t("Automatiska versioner")}
          isOn={preferences.isAutoSnapshotOn}
          onFlip={() =>
            updatePreferences((current) => ({
              ...current,
              isAutoSnapshotOn: !current.isAutoSnapshotOn,
            }))
          }
        />
      </Row>
      <Row
        label={t("Var versionerna sparas")}
        hint={t("I projektmappen, under snapshots. Penna raderar aldrig en version.")}
      />
      {book && <ZipRow onExportZip={book.onExportZip} />}
    </>
  );
}

function ZipRow({ onExportZip }: { onExportZip: () => void }) {
  return (
    <Row
      label={t("Exportera allt som zip")}
      hint={t(
        "Hela projektmappen med versioner och kommentarer, och seriens mapp om boken har en.",
      )}
    >
      <button className="button secondary small" onClick={onExportZip}>
        {t("Spara som zip…")}
      </button>
    </Row>
  );
}
