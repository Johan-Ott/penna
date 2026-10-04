import {
  changeSize,
  REPEAT_WINDOWS,
  THEME_LABELS,
  type ProseFont,
  type Theme,
  type WritingSettings,
} from "../../editor/writingSettings.js";
import type { AppPreferences } from "../appPreferences.js";
import { platform } from "../platform.js";
import type { PreferenceChange } from "../useStartup.js";
import type { SettingsChange } from "../useWritingSettings.js";
import { Choice, Row, Switch } from "./controls.js";

export interface TabProps {
  preferences: AppPreferences;
  updatePreferences: (change: PreferenceChange) => void;
  settings: WritingSettings;
  onChangeSettings: (change: SettingsChange) => void;
}

const THEMES = Object.entries(THEME_LABELS) as [Theme, string][];
const FONTS: [ProseFont, string][] = [
  ["serif", "Serif"],
  ["sans", "Sans"],
  ["mono", "Mono"],
];

async function changeLibrary(update: TabProps["updatePreferences"]) {
  const folder = await platform.pickFolder();
  if (folder) update((current) => ({ ...current, libraryDir: folder }));
}

function GoalInput({ preferences, updatePreferences }: TabProps) {
  return (
    <input
      className="settings-number"
      type="number"
      min={1}
      step={100}
      aria-label="Dagligt ordmål"
      value={preferences.defaultDailyGoal}
      onChange={(event) => {
        const goal = Math.round(Number(event.target.value));
        if (goal > 0) updatePreferences((current) => ({ ...current, defaultDailyGoal: goal }));
      }}
    />
  );
}

function AuthorInput({ preferences, updatePreferences }: TabProps) {
  return (
    <input
      className="settings-text"
      placeholder="Namn eller pseudonym"
      aria-label="Författarnamn"
      value={preferences.authorName}
      onChange={(event) =>
        updatePreferences((current) => ({ ...current, authorName: event.target.value }))
      }
    />
  );
}

function LibraryButton({ updatePreferences }: TabProps) {
  return (
    <button
      className="button secondary small"
      onClick={() => void changeLibrary(updatePreferences)}
    >
      Ändra…
    </button>
  );
}

export function GeneralTab(props: TabProps) {
  const { preferences, settings, onChangeSettings } = props;
  return (
    <>
      <Row label="Författarnamn" hint="Används i export.">
        <AuthorInput {...props} />
      </Row>
      <Row label="Språk" hint="Engelska kommer i en senare version.">
        Svenska
      </Row>
      <Row label="Utseende" hint="Följer systemet om inget annat väljs.">
        <Choice
          label="Utseende"
          value={settings.theme}
          options={THEMES}
          onSelect={(theme) => onChangeSettings((current) => ({ ...current, theme }))}
        />
      </Row>
      <Row label="Projektmapp" hint={preferences.libraryDir ?? "Där nya projekt skapas."}>
        <LibraryButton {...props} />
      </Row>
      <Row label="Dagligt ordmål" hint="Standard för nya projekt.">
        <GoalInput {...props} />
      </Row>
    </>
  );
}

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
