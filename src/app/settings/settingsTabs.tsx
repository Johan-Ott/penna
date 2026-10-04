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

export interface TabProps {
  preferences: AppPreferences;
  updatePreferences: (change: PreferenceChange) => void;
  settings: WritingSettings;
  onChangeSettings: (change: SettingsChange) => void;
  /** The open book's language, or null on the bookshelf. */
  book: { language: string; onChangeLanguage: (language: string) => void } | null;
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
      <button aria-label="Mindre" onClick={step(-1)}>
        –
      </button>
      <span>{settings.size}</span>
      <button aria-label="Större" onClick={step(1)}>
        +
      </button>
    </span>
  );
}

type EditorSwitch = "typewriter" | "spellcheck" | "typography" | "review";
const EDITOR_SWITCHES: [EditorSwitch, string, string][] = [
  ["typewriter", "Typewriter-läge", "Raden du skriver på stannar mitt på skärmen i fokusläget."],
  ["spellcheck", "Stavningskontroll", "Systemets ordlista stryker under felstavade ord."],
  [
    "typography",
    "Svensk typografi medan du skriver",
    'Två bindestreck blir talstreck och "citat" blir ”citat”.',
  ],
  ["review", "Granskning", "Namnstavning och upprepningar, i texten och i en panel bredvid."],
];

const WINDOWS = REPEAT_WINDOWS.map((sentences): [string, string] => [
  String(sentences),
  String(sentences),
]);

function RepeatWindowRow({ settings, onChangeSettings }: TabProps) {
  return (
    <Row label="Upprepningsfönster" hint="Hur många meningar som ska skilja samma ord åt.">
      <Choice
        label="Upprepningsfönster"
        value={String(settings.repeatWindow)}
        options={WINDOWS}
        onSelect={(value) =>
          onChangeSettings((current) => ({ ...current, repeatWindow: Number(value) }))
        }
      />
    </Row>
  );
}

export function EditorTab(props: TabProps) {
  const { settings, onChangeSettings } = props;
  return (
    <>
      <Row label="Typsnitt" hint="Bara för skrivandet. Boken formges i Bokdesign.">
        <Choice
          label="Typsnitt"
          value={settings.font}
          options={FONTS}
          onSelect={(font) => onChangeSettings((current) => ({ ...current, font }))}
        />
      </Row>
      <Row label="Textstorlek" hint="Ctrl och plus eller minus ändrar den medan du skriver.">
        <SizeStepper {...props} />
      </Row>
      {EDITOR_SWITCHES.map(([key, label, hint]) => (
        <Row key={key} label={label} hint={hint}>
          <Switch
            label={label}
            isOn={settings[key]}
            onFlip={() => onChangeSettings((current) => ({ ...current, [key]: !current[key] }))}
          />
        </Row>
      ))}
      <RepeatWindowRow {...props} />
    </>
  );
}

export function SnapshotsTab({ preferences, updatePreferences }: TabProps) {
  return (
    <>
      <Row label="Automatiska bilder" hint="Sparas när en scen har ändrats mycket.">
        <Switch
          label="Automatiska bilder"
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
        label="Var bilderna sparas"
        hint="I projektmappen, under snapshots. Penna raderar aldrig en bild."
      />
    </>
  );
}
