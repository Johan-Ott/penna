import { useState } from "react";
import { trimSize } from "../../export/bookDesign.js";
import { t } from "../../i18n/i18n.js";
import { ChoiceRow } from "./ChoiceRow.js";

const CUSTOM = "egen";
const isPrintable = (side: number) => side >= 90 && side <= 300;

// Holds what is typed, so "1" on the way to "140" is not saved and thrown back.
function SideInput(props: { label: string; value: number; onChange: (value: number) => void }) {
  const [typed, setTyped] = useState(String(props.value));
  return (
    <input
      className="design-number"
      type="number"
      min={90}
      max={300}
      aria-label={props.label}
      value={typed}
      onChange={(event) => {
        setTyped(event.target.value);
        const side = Math.round(Number(event.target.value));
        if (isPrintable(side)) props.onChange(side);
      }}
    />
  );
}

function CustomSize({ trim, onChange }: { trim: string; onChange: (trim: string) => void }) {
  const { width, height } = trimSize(trim);
  return (
    <div className="design-row">
      <span>{t("Bredd × höjd, mm")}</span>
      <span className="design-size">
        <SideInput
          label={t("Bredd")}
          value={width}
          onChange={(side) => onChange(`${side}x${height}`)}
        />
        ×
        <SideInput
          label={t("Höjd")}
          value={height}
          onChange={(side) => onChange(`${width}x${side}`)}
        />
      </span>
    </div>
  );
}

/** One of the printers' sizes, or a custom width and height. */
export function TrimRow(props: {
  trim: string;
  trims: [string, string][];
  onChange: (trim: string) => void;
}) {
  const [isCustom, setCustom] = useState(!props.trims.some(([trim]) => trim === props.trim));
  const choose = (value: string) => {
    setCustom(value === CUSTOM);
    if (value !== CUSTOM) props.onChange(value);
  };
  return (
    <>
      <ChoiceRow
        label={t("Format")}
        value={isCustom ? CUSTOM : props.trim}
        choices={[...props.trims, [CUSTOM, t("Eget format…")]]}
        onChoose={choose}
      />
      {isCustom && <CustomSize trim={props.trim} onChange={props.onChange} />}
    </>
  );
}
