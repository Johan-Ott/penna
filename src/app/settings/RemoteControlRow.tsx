import { useEffect, useState } from "react";
import { Row, Switch } from "../controls.js";
import { platform, type RemoteState } from "../platform.js";
import { t } from "../../i18n/i18n.js";

/** Whether tools may drive Penna now and at the next start; null where they never can. */
export function useRemoteState() {
  const remote = platform.remoteControl;
  const [state, setState] = useState<RemoteState | null>(null);
  useEffect(() => void remote?.().then(setState), [remote]);
  const flip = () => void remote?.(!state?.isNext).then(setState);
  return remote ? { state, flip } : null;
}

/** Styr Penna från den här datorn: for scripts/penna.mjs and Claude Code, for one start. */
export function RemoteControlRow() {
  const remote = useRemoteState();
  if (!remote) return null;
  const isOpen = remote.state?.isOpen === true;
  return (
    <Row
      label={t("Styr Penna från den här datorn")}
      hint={
        isOpen
          ? t(
              "På nu. Skript och verktyg som Claude Code på den här datorn kan läsa och ändra böckerna tills Penna stängs.",
            )
          : t(
              "Gäller nästa start, och bara den. Skript och verktyg som Claude Code på den här datorn kan då läsa och ändra böckerna.",
            )
      }
    >
      <Switch
        label={t("Styr Penna från den här datorn")}
        isOn={remote.state?.isNext === true}
        onFlip={remote.flip}
      />
    </Row>
  );
}

/** In the top bar while the port is open, so it is never on unseen. */
export function RemoteBadge() {
  const remote = useRemoteState();
  if (!remote?.state?.isOpen) return null;
  return (
    <span
      className="remote-badge"
      title={t("Verktyg på den här datorn kan styra Penna tills den stängs.")}
    >
      {t("Styrs utifrån")}
    </span>
  );
}
