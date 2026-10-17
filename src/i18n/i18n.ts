import { addEnglish } from "@llkit/i18n.js";
import english from "./en.json";

// Penna's texts, looked up by llkit's i18n; Penna imports t and the rest from here.
addEnglish(english);

export {
  formatNumber,
  numberLocale,
  setUiLanguage,
  t,
  uiLanguage,
  UI_LANGUAGES,
  type UiLanguage,
} from "@llkit/i18n.js";
