import { useEffect, useState } from "react";
import { Row } from "@llkit/controls.js";
import {
  COMMANDS,
  MODIFIER_NAME,
  rebind,
  resetBindings,
  shortcutText,
  takenBy,
  useBinding,
  type Binding,
  type CommandId,
} from "../shortcuts.js";
import { t } from "../../i18n/i18n.js";

// What the editor and the system own: shown, never moved, and never given to another command.
const FIXED: [string, string][] = [
  [t("Lämna fokusläget"), "Esc"],
  [t("Scenbrytning"), shortcutText({ key: "enter" })],
  [t("Infoga fotnot"), shortcutText({ key: "f", alt: true })],
  [t("Fetstil"), shortcutText({ key: "b" })],
  [t("Kursiv"), shortcutText({ key: "i" })],
  [t("Större och mindre text"), `${shortcutText({ key: "+" })} och ${shortcutText({ key: "-" })}`],
  [t("Byt namn i strukturen"), "F2"],
];
const RESERVED_KEYS = "a b c i s v x y z 0 - + = enter".split(" ");

// Alt belongs to the footnote alone; the bare keys are the editor's and the system's.
const isReserved = (binding: Binding) =>
  !binding.shift && (binding.alt ? binding.key === "f" : RESERVED_KEYS.includes(binding.key));

const MODIFIER_KEYS = ["control", "shift", "alt", "meta"];

function bindingFrom(event: KeyboardEvent): Binding | undefined {
  const key = event.key.toLowerCase();
  if (!(event.ctrlKey || event.metaKey) || MODIFIER_KEYS.includes(key)) return undefined;
  return { key, shift: event.shiftKey, alt: event.altKey };
}

function problemWith(id: CommandId, binding: Binding) {
  const other = takenBy(id, binding);
  if (other) return t("Används redan av {name}", { name: COMMANDS[other].label });
  return isReserved(binding) ? t("Används redan av Penna") : undefined;
}

// Pressing the button listens for the next keys with the shortcut key held; Escape leaves them
// as they were.
function useKeyListener(id: CommandId, isListening: boolean, done: (problem?: string) => void) {
  useEffect(() => {
    if (!isListening) return;
    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.key === "Escape") return done();
      const binding = bindingFrom(event);
      if (!binding) return;
      const problem = problemWith(id, binding);
      if (!problem) rebind(id, binding);
      done(problem);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [id, isListening, done]);
}

function CommandRow({ id }: { id: CommandId }) {
  const binding = useBinding(id);
  const [isListening, setListening] = useState(false);
  const [problem, setProblem] = useState<string>();
  useKeyListener(id, isListening, (found) => {
    setListening(false);
    setProblem(found);
  });
  const hint = isListening
    ? t("Tryck de nya tangenterna med {modifier}. Esc avbryter.", { modifier: MODIFIER_NAME })
    : problem;
  return (
    <Row label={COMMANDS[id].label} hint={hint}>
      <button className="shortcut-key" onClick={() => setListening(true)}>
        <kbd>{isListening ? "…" : shortcutText(binding)}</kbd>
      </button>
    </Row>
  );
}

export function ShortcutsTab() {
  return (
    <>
      {(Object.keys(COMMANDS) as CommandId[]).map((id) => (
        <CommandRow key={id} id={id} />
      ))}
      {FIXED.map(([label, keys]) => (
        <Row key={label} label={label}>
          <kbd>{keys}</kbd>
        </Row>
      ))}
      <button className="button secondary small" onClick={resetBindings}>
        {t("Återställ kortkommandona")}
      </button>
    </>
  );
}
