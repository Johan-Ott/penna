import { useState } from "react";
import { errorLog } from "../errorLog.js";
import { Row } from "../controls.js";
import { t } from "../../i18n/i18n.js";

const SHORTCUTS: [string, string][] = [
  [t("Kommandopalett"), "Ctrl K"],
  [t("Sök och ersätt"), "Ctrl F"],
  [t("Fokusläge"), "Ctrl Shift F"],
  [t("Lämna fokusläget"), "Esc"],
  [t("Ny scen"), "Ctrl Alt N"],
  [t("Scenbrytning"), "Ctrl Enter"],
  [t("Infoga fotnot"), "Ctrl Alt F"],
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

// The report goes to the clipboard, so the writer chooses where to send it and sees what it holds.
function ErrorReportButton() {
  const [isCopied, setCopied] = useState(false);
  const copy = async () => {
    const report = errorLog.report({ version: __APP_VERSION__, device: navigator.userAgent });
    await navigator.clipboard.writeText(report);
    setCopied(true);
  };
  return (
    <button className="button secondary small" onClick={() => void copy()}>
      {isCopied ? t("Kopierad") : t("Kopiera felrapport")}
    </button>
  );
}

// What Penna is built with, as their licences ask.
function Credits() {
  return (
    <>
      <Row
        label={t("Typsnitt")}
        hint={t(
          "Literata, EB Garamond, Crimson Pro, Libre Baskerville, Source Serif 4 och Geist, under SIL Open Font License.",
        )}
      />
      <Row label={t("Boksättning")} hint={t("Typst, under Apache License 2.0.")} />
      <Row
        label={t("Stavning")}
        hint={t(
          "Spellbook, under MPL 2.0. Svensk ordlista av Göran Andersson, under LGPL 3. Brittisk engelsk ordlista ur SCOWL, under MIT och BSD. Danska, norska och tyska ordlistor hämtas första gången en bok behöver dem, under sina egna licenser.",
        )}
      />
    </>
  );
}

export function AboutTab() {
  return (
    <>
      <Row label={t("Version")}>{__APP_VERSION__}</Row>
      <Row
        label={t("Felrapport")}
        hint={t("Version, enhet och de senaste felen, att klistra in i ett mejl till oss.")}
      >
        <ErrorReportButton />
      </Row>
      <Row
        label={t("Integritet")}
        hint={t(
          "Penna samlar inte in någon data. Text lämnar enheten bara om du kopplar din egen Google Drive.",
        )}
      />
      <Credits />
    </>
  );
}
