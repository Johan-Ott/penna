import { useState } from "react";
import { THEME_LABELS, type Theme } from "../../editor/writingSettings.js";
import { BOOK_LANGUAGES } from "../../project/bookLanguage.js";
import { BackButton, Choice } from "@llkit/controls.js";
import { platform } from "../platform.js";
import { numberLocale, t } from "../../i18n/i18n.js";

// The first start's choices: which languages the books are written in, whose dictionaries are
// fetched now, how Skrivro looks, and a day's goal. Each can be changed later in Inställningar.

export interface Choices {
  /** On covers and title pages; empty until written. */
  authorName: string;
  /** The first is a new book's language. */
  languages: string[];
  dailyGoal: number;
}

/** A new writer's first book language, from the language Skrivro is shown in. */
export const firstLanguage = () => numberLocale();

const THEMES = Object.entries(THEME_LABELS) as [Theme, string][];
// No goal first, two to start from, and the writer's own number.
const OWN = "eget";
const goals = (): [string, string][] => [
  ["0", t("Inget mål")],
  ["500", "500"],
  ["1000", "1000"],
  [OWN, t("Eget")],
];

function DailyGoal(props: { value: string; onChange: (goal: string) => void }) {
  const [choice, setChoice] = useState(props.value);
  const isOwn = choice === OWN;
  const choose = (next: string) => {
    setChoice(next);
    props.onChange(next === OWN ? "" : next);
  };
  return (
    <>
      <span className="field-label">{t("Ord om dagen")}</span>
      <Choice label={t("Ord om dagen")} value={choice} options={goals()} onSelect={choose} />
      {isOwn && (
        <input
          className="onboarding-goal"
          inputMode="numeric"
          aria-label={t("Eget mål, ord om dagen")}
          placeholder={t("Till exempel 750")}
          value={props.value}
          onChange={(event) => props.onChange(event.target.value.replace(/\D/g, ""))}
        />
      )}
    </>
  );
}

function LanguageChips(props: { chosen: string[]; onChange: (chosen: string[]) => void }) {
  const flip = (tag: string) =>
    props.onChange(
      props.chosen.includes(tag)
        ? props.chosen.filter((each) => each !== tag)
        : [...props.chosen, tag],
    );
  return (
    <>
      <span className="field-label">{t("Vilka språk skriver du på?")}</span>
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
    </>
  );
}

const AuthorField = (props: { value: string; onChange: (name: string) => void }) => (
  <label className="onboarding-field">
    <span className="field-label">{t("Ditt namn som författare")}</span>
    <input
      value={props.value}
      placeholder={t("Står på omslag och titelsida")}
      onChange={(event) => props.onChange(event.target.value)}
    />
  </label>
);

// Only the apps fetch; the browser has what it needs.
const FetchNote = () =>
  platform.spelling ? (
    <p className="setting-hint">
      {t("Ordlistorna och det som gör boken tryckfärdig hämtas medan du börjar, cirka 13 MB.")}
    </p>
  ) : null;

const choicesOf = (authorName: string, languages: string[], dailyGoal: string): Choices => ({
  authorName: authorName.trim(),
  languages,
  dailyGoal: Number(dailyGoal) || 0,
});

export function FirstChoices(props: {
  theme: Theme;
  onTheme: (theme: Theme) => void;
  onDone: (choices: Choices) => void;
  onBack: () => void;
}) {
  const [languages, setLanguages] = useState([firstLanguage()]);
  const [dailyGoal, setDailyGoal] = useState("0");
  const [authorName, setAuthorName] = useState("");
  return (
    <div className="first-choices">
      <BackButton onBack={props.onBack} />
      <h2>{t("Gör Skrivro till din")}</h2>
      <AuthorField value={authorName} onChange={setAuthorName} />
      <LanguageChips chosen={languages} onChange={setLanguages} />
      <span className="field-label">{t("Utseende")}</span>
      <Choice label={t("Utseende")} value={props.theme} options={THEMES} onSelect={props.onTheme} />
      <DailyGoal value={dailyGoal} onChange={setDailyGoal} />
      <FetchNote />
      <button
        className="button primary large"
        disabled={languages.length === 0}
        onClick={() => props.onDone(choicesOf(authorName, languages, dailyGoal))}
      >
        {t("Klar")}
      </button>
    </div>
  );
}
