import { t, UI_LANGUAGES, type UiLanguage } from "../../i18n/i18n.js";
import { loadPreferences, savePreferences } from "../appPreferences.js";
import { browserStorage } from "../browserStorage.js";
import { Choice } from "../controls.js";

// Texts are translated as the app starts, so a change reloads the window. It fades out first
// and in again after (index.html), on the same colour, so the change never flashes.
const FADE_MS = 150;

function chooseLanguage(language: UiLanguage) {
  const storage = browserStorage();
  const preferences = loadPreferences(storage);
  if (preferences.uiLanguage === language) return;
  savePreferences(storage, { ...preferences, uiLanguage: language });
  document.documentElement.classList.add("leaving");
  const isCalm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  setTimeout(() => window.location.reload(), isCalm ? 0 : FADE_MS);
}

export function UiLanguageChoice() {
  const current = loadPreferences(browserStorage()).uiLanguage;
  return (
    <Choice label={t("Språk")} value={current} options={UI_LANGUAGES} onSelect={chooseLanguage} />
  );
}
