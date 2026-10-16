import { platform } from "../platform.js";
import { useState } from "react";
import { errorLog } from "../errorLog.js";
import { Row } from "../controls.js";
import { numberLocale, t } from "../../i18n/i18n.js";

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

// What went wrong since Penna started, shown here instead of only in the copied report.
function RecentErrors() {
  const [latest] = useState(() => errorLog.latest());
  if (latest.length === 0)
    return <p className="error-list-empty">{t("Inga fel sedan starten.")}</p>;
  return (
    <ul className="error-list" aria-label={t("Fel sedan starten")}>
      {latest.map(({ time, message }) => (
        <li key={`${time} ${message}`}>
          <span className="error-time">
            {new Date(time).toLocaleTimeString(numberLocale(), { timeStyle: "short" })}
          </span>{" "}
          {message}
        </li>
      ))}
    </ul>
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

const PRIVACY_URL = "https://johan-ott.github.io/penna/integritet.html";
const SUPPORT_URL = "https://github.com/Johan-Ott/penna/issues";

export function AboutTab() {
  return (
    <>
      <Row label={t("Version")}>{__APP_VERSION__}</Row>
      <Row
        label={t("Felrapport")}
        hint={t("Version, enhet och de senaste felen, att klistra in när du ber om hjälp.")}
      >
        <ErrorReportButton />
      </Row>
      <RecentErrors />
      <Row
        label={t("Integritet")}
        hint={t(
          "Penna har inga konton och samlar inte in något. Dina texter lämnar enheten bara till din egen Google Drive, om du kopplar den. Penna frågar GitHub om det finns en ny version och hämtar ordlistor från jsDelivr; feedback går via Formspree. De ser att en enhet frågar, aldrig vad du skriver.",
        )}
      >
        <button className="link-button" onClick={() => void platform.openLink(PRIVACY_URL)}>
          {t("Integritetspolicy")}
        </button>
      </Row>
      <Row label={t("Hjälp och support")} hint={t("Frågor, fel och önskemål.")}>
        <button className="link-button" onClick={() => void platform.openLink(SUPPORT_URL)}>
          {t("Skriv till oss")}
        </button>
      </Row>
      <Credits />
    </>
  );
}
