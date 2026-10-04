import { THEME_LABELS, type Theme } from "../../editor/writingSettings.js";
import { BOOK_LANGUAGES } from "../../project/bookLanguage.js";
import { platform } from "../platform.js";
import { Choice, Row } from "./controls.js";
import type { TabProps } from "./settingsTabs.js";

function BookLanguage({ book }: Pick<TabProps, "book">) {
  if (!book) return null;
  return (
    <Row
      label="Bokens språk"
      hint="Stavningskontroll och e-bokens språk. Penna startar om vid byte."
    >
      <select
        className="settings-select"
        aria-label="Bokens språk"
        value={book.language}
        onChange={(event) => book.onChangeLanguage(event.target.value)}
      >
        {BOOK_LANGUAGES.map(([tag, name]) => (
          <option key={tag} value={tag}>
            {name}
          </option>
        ))}
      </select>
    </Row>
  );
}

const THEMES = Object.entries(THEME_LABELS) as [Theme, string][];
async function changeLibrary(update: TabProps["updatePreferences"]) {
  const folder = await platform.pickFolder();
  if (folder) update((current) => ({ ...current, libraryDir: folder }));
}

function GoalInput({ preferences, updatePreferences }: TabProps) {
  return (
    <input
      className="settings-number"
      type="number"
      min={1}
      step={100}
      aria-label="Dagligt ordmål"
      value={preferences.defaultDailyGoal}
      onChange={(event) => {
        const goal = Math.round(Number(event.target.value));
        if (goal > 0) updatePreferences((current) => ({ ...current, defaultDailyGoal: goal }));
      }}
    />
  );
}

function AuthorInput({ preferences, updatePreferences }: TabProps) {
  return (
    <input
      className="settings-text"
      placeholder="Namn eller pseudonym"
      aria-label="Författarnamn"
      value={preferences.authorName}
      onChange={(event) =>
        updatePreferences((current) => ({ ...current, authorName: event.target.value }))
      }
    />
  );
}

function LibraryButton({ updatePreferences }: TabProps) {
  return (
    <button
      className="button secondary small"
      onClick={() => void changeLibrary(updatePreferences)}
    >
      Ändra…
    </button>
  );
}

export function GeneralTab(props: TabProps) {
  const { preferences, settings, onChangeSettings } = props;
  return (
    <>
      <Row label="Författarnamn" hint="Används i export.">
        <AuthorInput {...props} />
      </Row>
      <Row label="Språk" hint="Engelska kommer i en senare version.">
        Svenska
      </Row>
      <BookLanguage book={props.book} />
      <Row label="Utseende" hint="Följer systemet om inget annat väljs.">
        <Choice
          label="Utseende"
          value={settings.theme}
          options={THEMES}
          onSelect={(theme) => onChangeSettings((current) => ({ ...current, theme }))}
        />
      </Row>
      <Row label="Projektmapp" hint={preferences.libraryDir ?? "Där nya projekt skapas."}>
        <LibraryButton {...props} />
      </Row>
      <Row label="Dagligt ordmål" hint="Standard för nya projekt.">
        <GoalInput {...props} />
      </Row>
    </>
  );
}
