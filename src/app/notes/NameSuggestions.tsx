import { useState } from "react";
import { NAME_SETS, nameSetFor, suggestNames } from "../../project/names.js";
import { t } from "../../i18n/i18n.js";

const COUNT = 4;

function SetPicker(props: { setId: string; onChoose: (id: string) => void }) {
  return (
    <select
      className="name-set"
      aria-label={t("Namn från")}
      value={props.setId}
      onChange={(event) => props.onChoose(event.target.value)}
    >
      {NAME_SETS.map((each) => (
        <option key={each.id} value={each.id}>
          {each.label}
        </option>
      ))}
    </select>
  );
}

/** A person with no name yet: a few to pick from, from a chosen place and time. */
export function NameSuggestions(props: { language: string; onPick: (name: string) => void }) {
  const [setId, setSetId] = useState(() => nameSetFor(props.language).id);
  const set = NAME_SETS.find((each) => each.id === setId) ?? nameSetFor(props.language);
  const [names, setNames] = useState(() => suggestNames(set, COUNT));
  const choose = (id: string) => {
    setSetId(id);
    setNames(suggestNames(NAME_SETS.find((each) => each.id === id) ?? set, COUNT));
  };
  return (
    <div className="name-suggestions" role="group" aria-label={t("Namnförslag")}>
      {names.map((name) => (
        <button key={name} type="button" className="chip" onClick={() => props.onPick(name)}>
          {name}
        </button>
      ))}
      <button
        type="button"
        className="chip quiet"
        onClick={() => setNames(suggestNames(set, COUNT))}
      >
        {t("Fler")}
      </button>
      <SetPicker setId={setId} onChoose={choose} />
    </div>
  );
}
