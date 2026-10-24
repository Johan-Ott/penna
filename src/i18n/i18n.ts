import { addEnglish } from "@llkit/i18n.js";
import english from "./en.json";

// Skrivro's texts, looked up by llkit's i18n; Skrivro imports t and the rest from here.
addEnglish(english);

export {
  addLanguagePack,
  formatNumber,
  isBuiltIn,
  isSwedish,
  isUiLanguage,
  numberLocale,
  setUiLanguage,
  t,
  uiLanguage,
  UI_LANGUAGES,
  type UiLanguage,
} from "@llkit/i18n.js";
