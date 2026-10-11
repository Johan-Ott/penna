import { useEffect, useState } from "react";
import { Row, Switch } from "../controls.js";
import { platform } from "../platform.js";
import { t } from "../../i18n/i18n.js";

/** Styr Penna från den här datorn: for scripts/penna.mjs and Claude Code, from the next start. */
export function RemoteControlRow() {
  const remote = platform.remoteControl;
  const [isOn, setOn] = useState(false);
  useEffect(() => void remote?.().then(setOn), [remote]);
  if (!remote) return null;
  return (
    <Row
      label={t("Styr Penna från den här datorn")}
      hint={t(
        "Skript och verktyg som Claude Code på den här datorn kan läsa och ändra böckerna medan Penna är igång. Gäller från nästa start.",
      )}
    >
      <Switch
        label={t("Styr Penna från den här datorn")}
        isOn={isOn}
        onFlip={() => void remote(!isOn).then(setOn)}
      />
    </Row>
  );
}
