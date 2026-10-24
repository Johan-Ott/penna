import { browserStorage } from "@llkit/storage/browserStorage.js";
import { loadPreferences } from "../app/appPreferences.js";
import { addLanguagePack, isBuiltIn, setUiLanguage } from "./i18n.js";
import { keptPack } from "./languagePacks.js";

// Imported first in main.tsx, so texts made when other modules load are already translated. A
// fetched language uses the texts it was fetched with; a newer version's come after the start.
const language = loadPreferences(browserStorage()).uiLanguage;
setUiLanguage(language);
if (!isBuiltIn(language)) addLanguagePack(keptPack(language)?.texts ?? {});
