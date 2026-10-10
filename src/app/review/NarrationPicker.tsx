import {
  canBeDeep,
  TENSES,
  VOICES,
  type Narration,
  type Voice,
} from "../../manuscript/narration.js";
import { Choice, Dropdown, Switch } from "../controls.js";
import { t } from "../../i18n/i18n.js";

const VOICE_CHOICES: [Voice | "", string][] = [["", t("Inte vald")], ...VOICES];

function DeepSwitch(props: { value: Narration; onChange: (narration: Narration) => void }) {
  const { value } = props;
  if (!canBeDeep(value.voice)) return null;
  return (
    <label className="narration-deep">
      <span className="narration-deep-text">
        <span>{t("Deep POV")}</span>
        <span className="setting-hint">
          {t("Läsaren är i personens huvud, som om man vore hen.")}
        </span>
      </span>
      <Switch
        label={t("Deep POV")}
        isOn={value.deep}
        onFlip={() => props.onChange({ ...value, deep: !value.deep })}
      />
    </label>
  );
}

// A new voice keeps the tense, and deep POV where the voice can have it.
const withVoice = (value: Narration | null, voice: Voice | ""): Narration | null =>
  voice
    ? { voice, tense: value?.tense ?? "dåtid", deep: canBeDeep(voice) && (value?.deep ?? false) }
    : null;

/** How the book is told; Granska watches the narration for it once one is chosen. */
export function NarrationPicker(props: {
  value: Narration | null;
  onChange: (narration: Narration | null) => void;
}) {
  const { value } = props;
  const chooseVoice = (voice: Voice | "") => props.onChange(withVoice(value, voice));
  return (
    <div className="narration-picker">
      <Dropdown
        label={t("Berättarröst")}
        value={value?.voice ?? ""}
        options={VOICE_CHOICES}
        onSelect={chooseVoice}
      />
      {value && (
        <Choice
          label={t("Tempus")}
          value={value.tense}
          options={TENSES}
          onSelect={(tense) => props.onChange({ ...value, tense })}
        />
      )}
      {value && <DeepSwitch value={value} onChange={props.onChange} />}
    </div>
  );
}
