import { Dropdown } from "../controls.js";

export function ChoiceRow(props: {
  label: string;
  value: string;
  choices: [string, string][];
  onChoose: (value: string) => void;
}) {
  return (
    <div className="design-row">
      <span>{props.label}</span>
      <Dropdown
        label={props.label}
        value={props.value}
        options={props.choices}
        onSelect={props.onChoose}
      />
    </div>
  );
}
