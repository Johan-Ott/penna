import { Row } from "./controls.js";
import { t } from "../../i18n/i18n.js";

const SHORTCUTS: [string, string][] = [
  [t("Kommandopalett"), "Ctrl K"],
  [t("Sök och ersätt"), "Ctrl F"],
  [t("Fokusläge"), "Ctrl Shift F"],
  [t("Lämna fokusläget"), "Esc"],
  [t("Ny scen"), "Ctrl Alt N"],
  [t("Scenbrytning"), "Ctrl Enter"],
  [t("Dela scenen vid markören"), "Ctrl Shift Enter"],
  [t("Kommentera markeringen"), "Ctrl Shift M"],
  [t("Fetstil"), "Ctrl B"],
  [t("Kursiv"), "Ctrl I"],
  [t("Större och mindre text"), "Ctrl + och Ctrl −"],
  [t("Byt namn i strukturen"), "F2"],
  [t("Inställningar"), "Ctrl ,"],
  [t("Visa sidomenyn i ett smalt fönster"), "Ctrl ."],
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
      <Row label={t("Version")}>{__APP_VERSION__}</Row>
      <Row
        label={t("Integritet")}
        hint={t("Penna samlar inte in någon data, och ingen text lämnar datorn.")}
      />
      <Row
        label={t("Typsnitt")}
        hint={t("Literata, EB Garamond och Geist, under SIL Open Font License.")}
      />
      <Row label={t("Boksättning")} hint={t("Typst, under Apache License 2.0.")} />
    </>
  );
}
