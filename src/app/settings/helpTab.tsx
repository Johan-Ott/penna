import { t, uiLanguage } from "../../i18n/i18n.js";
import { restartGuide } from "../guide/guide.js";
import { platform } from "../platform.js";

/** Nytt i Skrivro on the website, in the language Skrivro is shown in. */
export const newsPage = () =>
  `https://johan-ott.github.io/skrivro/${uiLanguage() === "en" ? "news.html" : "nytt.html"}`;

// Short, for testers and new writers: where the book is, how it is kept safe, and what is missing.
const SECTIONS: [string, string[]][] = [
  [
    t("Din bok"),
    [
      t(
        "Varje bok är en vanlig mapp i bokhyllans mapp. Varje scen är en textfil i scenes/, som du kan öppna i vilket program som helst.",
      ),
      t(
        "Delar, kapitel och scener ordnar du i sidomenyn, på telefonen under Boken. ⋯ på en rad, eller högerklick, ger radens meny. I Innehåll ser du hela boken med vad som händer, när och hur långt du har kommit.",
      ),
      t(
        "Bilder: Infoga bild… i paletten, eller Bild över tangentbordet på telefonen, lägger en karta eller ett foto i texten, smal, bred eller på egen sida.",
      ),
      t(
        "Bredvid: välj Öppna bredvid i en scens meny, eller jämför en äldre version bredvid texten under Versioner. På telefonen finns bara en text i taget.",
      ),
    ],
  ],
  [
    t("Så skyddas texten"),
    [
      t("Allt sparas inom en sekund medan du skriver."),
      t(
        "Versioner: varje text sparas som en ny version vid större ändringar. Meny, Kopior och export, Versioner av den här texten.",
      ),
      t(
        "Säkerhetskopior: hela boken kopieras när den öppnas och var halvtimme. Meny, Kopior och export, Säkerhetskopior.",
      ),
      t("Synk: logga in med Google under Konto så finns böckerna på alla dina enheter."),
    ],
  ],
  [
    t("Publicera"),
    [
      t(
        "Under Publicera väljer du format, typsnitt och scenbrytning, och ser boken som den blir tryckt. Kapitelöppningar är mallar med bilder, och varje kapitel kan byta ut bilderna.",
      ),
      t(
        "Exportera som PDF för tryck, som e-bok (EPUB), som manus i Word, eller tryckomslaget med rygg.",
      ),
      t(
        "Till en redaktör eller testläsare: välj Skicka till redaktör eller testläsare, så får du ett Word-manus. De ändrar och kommenterar i Word, Google Docs eller Pages, och du läser in filen under Meny, Dela och samarbeta, Läs in kommenterad Word-fil. Ändringarna och kommentarerna hamnar i Granska.",
      ),
    ],
  ],
  [
    t("Känt i den tidiga versionen"),
    [
      t(
        "Skrivro finns för Windows och Android. Mac-versionen byggs men är inte signerad eller prövad än, och iPad kommer senare.",
      ),
      t(
        "Windows kan varna för en okänd utgivare när du installerar. Välj Mer info och sedan Kör ändå.",
      ),
    ],
  ],
  [
    t("Hittar du något fel?"),
    [t("Meny, Hjälp, Skicka feedback. Allt läses, och små saker är lika välkomna som stora.")],
  ],
];

export function HelpTab() {
  return (
    <div className="help-tab">
      <div className="help-actions">
        <button className="button secondary small" onClick={restartGuide}>
          {t("Visa guiden igen")}
        </button>
        <button
          className="button secondary small"
          onClick={() => void platform.openLink(newsPage())}
        >
          {t("Nytt i Skrivro och vad som kommer")}
        </button>
      </div>
      {SECTIONS.map(([title, lines]) => (
        <section key={title}>
          <span className="design-section">{title}</span>
          {lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </section>
      ))}
    </div>
  );
}
