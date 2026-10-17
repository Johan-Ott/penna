import { addEnglish, setUiLanguage } from "@llkit/i18n.js";
import english from "./en.json";
import { loadSettings } from "./settings.js";

// The app's own texts, looked up by llkit's i18n by their Swedish. Imported first in main.tsx,
// so the language is set before any text is made.
addEnglish(english);
setUiLanguage(loadSettings().uiLanguage);

export { t } from "@llkit/i18n.js";
