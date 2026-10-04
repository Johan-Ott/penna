import { t, UI_LANGUAGES, type UiLanguage } from "../../i18n/i18n.js";
import { loadPreferences, savePreferences } from "../appPreferences.js";
import { browserStorage } from "../browserStorage.js";
import { Choice } from "./controls.js";

// Texts are translated as the app starts, so a new language is saved and the window reloaded.
function chooseLanguage(language: UiLanguage) {
  const storage = browserStorage();
  const preferences = loadPreferences(storage);
  if (preferences.uiLanguage === language) return;
  savePreferences(storage, { ...preferences, uiLanguage: language });
  window.location.reload();
}

/** Svenska or English for Penna's own interface; each book keeps its own language. */
export function UiLanguageChoice() {
  const current = loadPreferences(browserStorage()).uiLanguage;
  return (
    <Choice label={t("Språk")} value={current} options={UI_LANGUAGES} onSelect={chooseLanguage} />
  );
}
