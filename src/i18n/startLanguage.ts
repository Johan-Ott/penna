import { browserStorage } from "../app/browserStorage.js";
import { loadPreferences } from "../app/appPreferences.js";
import { setUiLanguage } from "./i18n.js";

// Imported first in main.tsx, so texts made when other modules load are already translated.
setUiLanguage(loadPreferences(browserStorage()).uiLanguage);
