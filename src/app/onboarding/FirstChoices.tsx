import { useState } from "react";
import { THEME_LABELS, type Theme } from "../../editor/writingSettings.js";
import { BOOK_LANGUAGES } from "../../project/bookLanguage.js";
import { Choice } from "../controls.js";
import { platform } from "../platform.js";
import { t, uiLanguage } from "../../i18n/i18n.js";

// The first start's choices: which languages the books are written in, whose dictionaries are
// fetched now, how Penna looks, and a day's goal. Each can be changed later in Inställningar.

export interface Choices {
  /** The first is a new book's language. */
  languages: string[];
  dailyGoal: number;
}

const THEMES = Object.entries(THEME_LABELS) as [Theme, string][];
const GOALS: [string, string][] = ["250", "500", "1000", "2000"].map((goal) => [goal, goal]);

function LanguageChips(props: { chosen: string[]; onChange: (chosen: string[]) => void }) {
  const flip = (tag: string) =>
    props.onChange(
      props.chosen.includes(tag)
        ? props.chosen.filter((each) => each !== tag)
        : [...props.chosen, tag],
    );
  return (
    <div className="chip-row" aria-label={t("Språk du skriver på")}>
      {BOOK_LANGUAGES.map(([tag, name]) => (
        <button
          key={tag}
          className="chip"
          aria-pressed={props.chosen.includes(tag)}
          onClick={() => flip(tag)}
        >
          {name}
        </button>
      ))}
    </div>
  );
}

// Only the apps fetch; the browser has what it needs.
const FetchNote = () =>
  platform.spelling ? (
    <p className="setting-hint">
      {t("Ordlistorna och sättmotorn för tryck hämtas medan du börjar, cirka 13 MB.")}
    </p>
  ) : null;

export function FirstChoices(props: {
  theme: Theme;
  onTheme: (theme: Theme) => void;
  onDone: (choices: Choices) => void;
}) {
  const [languages, setLanguages] = useState([uiLanguage() === "en" ? "en-GB" : "sv-SE"]);
  const [dailyGoal, setDailyGoal] = useState("1000");
  return (
    <div className="first-choices">
      <h2>{t("Gör Penna till din")}</h2>
      <span className="field-label">{t("Vilka språk skriver du på?")}</span>
      <LanguageChips chosen={languages} onChange={setLanguages} />
      <span className="field-label">{t("Utseende")}</span>
      <Choice label={t("Utseende")} value={props.theme} options={THEMES} onSelect={props.onTheme} />
      <span className="field-label">{t("Ord om dagen")}</span>
      <Choice label={t("Ord om dagen")} value={dailyGoal} options={GOALS} onSelect={setDailyGoal} />
      <FetchNote />
      <button
        className="button primary large"
        disabled={languages.length === 0}
        onClick={() => props.onDone({ languages, dailyGoal: Number(dailyGoal) })}
      >
        {t("Klar")}
      </button>
    </div>
  );
}
