import { Row } from "./controls.js";

const SHORTCUTS: [string, string][] = [
  ["Kommandopalett", "Ctrl K"],
  ["Sök och ersätt", "Ctrl F"],
  ["Fokusläge", "Ctrl Shift F"],
  ["Lämna fokusläget", "Esc"],
  ["Ny scen", "Ctrl Alt N"],
  ["Scenbrytning", "Ctrl Enter"],
  ["Kommentera markeringen", "Ctrl Shift M"],
  ["Fetstil", "Ctrl B"],
  ["Kursiv", "Ctrl I"],
  ["Större och mindre text", "Ctrl + och Ctrl −"],
  ["Byt namn i strukturen", "F2"],
  ["Inställningar", "Ctrl ,"],
];

export function ShortcutsTab() {
  return SHORTCUTS.map(([label, keys]) => (
    <Row key={label} label={label}>
      <kbd>{keys}</kbd>
    </Row>
  ));
}

export function AboutTab() {
  return (
    <>
      <Row label="Version">{__APP_VERSION__}</Row>
      <Row
        label="Integritet"
        hint="Penna samlar inte in någon data, och ingen text lämnar datorn."
      />
      <Row label="Typsnitt" hint="Literata och Geist, under SIL Open Font License." />
    </>
  );
}
