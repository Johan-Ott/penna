import type { ReactNode } from "react";

/** One line in the settings: what it is and why on the left, the control on the right. */
export function Row(props: { label: string; hint?: string; children?: ReactNode }) {
  return (
    <div className="settings-row">
      <span className="setting-text">
        <span>{props.label}</span>
        {props.hint && <span className="setting-hint">{props.hint}</span>}
      </span>
      <span className="settings-control">{props.children}</span>
    </div>
  );
}

export function Switch(props: { label: string; isOn: boolean; onFlip: () => void }) {
  return (
    <button
      className="toggle"
      role="switch"
      aria-checked={props.isOn}
      aria-label={props.label}
      onClick={props.onFlip}
    >
      <span />
    </button>
  );
}

export function Choice<T extends string>(props: {
  label: string;
  value: T;
  options: [T, string][];
  onSelect: (value: T) => void;
}) {
  return (
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
  );
}
