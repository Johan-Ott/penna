import { t } from "../../i18n/i18n.js";

// Short, for testers and new writers: where the book is, how it is kept safe, and what is missing.
const SECTIONS: [string, string[]][] = [
  [
    t("Din bok"),
    [
      t(
        "Varje bok är en vanlig mapp i bokhyllans mapp. Varje scen är en textfil i scenes/, som du kan öppna i vilket program som helst.",
      ),
      t(
        "Delar, kapitel och scener ordnar du i sidomenyn. I Innehåll ser du hela boken med vad som händer, när och hur långt du har kommit.",
      ),
    ],
  ],
  [
    t("Så skyddas texten"),
    [
      t("Allt sparas inom en sekund medan du skriver."),
      t(
        "Versioner: varje text sparas som en ny version vid större ändringar. Meny, Versioner av den här texten.",
      ),
      t(
        "Säkerhetskopior: hela boken kopieras när den öppnas och var halvtimme. Meny, Säkerhetskopior.",
      ),
      t("Synk: koppla din Google Drive under Synk så finns boken på alla dina enheter."),
    ],
  ],
  [
    t("Publicera"),
    [
      t(
        "Under Publicera väljer du format, typsnitt, kapitelöppningar och scenbrytning, och ser boken som den blir tryckt.",
      ),
      t(
        "Exportera som PDF för tryck, som e-bok (EPUB), som manus i Word, eller tryckomslaget med rygg.",
      ),
      t(
        "Till en redaktör: exportera manus i Word, låt redaktören skriva i filen och läs in den under Meny, Läs in redaktörens Word-fil. Varje ändring visas under Granska, att godta eller avvisa.",
      ),
    ],
  ],
  [
    t("Känt i alfaversionen"),
    [
      t("Penna finns för Windows och Android. Mac och iPad kommer senare."),
      t(
        "Windows kan varna för en okänd utgivare när du installerar. Välj Mer info och sedan Kör ändå.",
      ),
    ],
  ],
  [
    t("Hittar du något fel?"),
    [t("Meny, Skicka feedback. Allt läses, och små saker är lika välkomna som stora.")],
  ],
];

export function HelpTab() {
  return (
    <div className="help-tab">
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
