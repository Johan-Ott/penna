import { TENSES, VOICES, type Narration, type Voice } from "../../manuscript/narration.js";
import { Choice, Dropdown } from "../controls.js";
import { t } from "../../i18n/i18n.js";

const VOICE_CHOICES: [Voice | "", string][] = [["", t("Inte vald")], ...VOICES];

/** How the book is told; Granska watches the narration for it once one is chosen. */
export function NarrationPicker(props: {
  value: Narration | null;
  onChange: (narration: Narration | null) => void;
}) {
  const { value } = props;
  const chooseVoice = (voice: Voice | "") =>
    props.onChange(voice ? { voice, tense: value?.tense ?? "dåtid" } : null);
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
    </div>
  );
}
