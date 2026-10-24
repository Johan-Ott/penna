import { useState } from "react";
import { isBuiltIn, t, UI_LANGUAGES, type UiLanguage } from "../../i18n/i18n.js";
import { fetchPack, isPackCurrent } from "../../i18n/languagePacks.js";
import { loadPreferences, savePreferences } from "../appPreferences.js";
import { browserStorage } from "@llkit/storage/browserStorage.js";
import { Dropdown } from "@llkit/controls.js";
import { recordFailure } from "@llkit/errorLog.js";
import { platform } from "../platform.js";

// Texts are translated as the app starts, so a change reloads the window. It fades out first
// and in again after (index.html), on the same colour, so the change never flashes.
const FADE_MS = 150;

function restartIn(language: UiLanguage) {
  const storage = browserStorage();
  savePreferences(storage, { ...loadPreferences(storage), uiLanguage: language });
  document.documentElement.classList.add("leaving");
  const isCalm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  setTimeout(() => window.location.reload(), isCalm ? 0 : FADE_MS);
}

type Fetching = "hämtar" | "misslyckades" | null;

/** Swedish and English at once; another language is fetched first, as a dictionary is. */
export function UiLanguageChoice() {
  const current = loadPreferences(browserStorage()).uiLanguage;
  const [fetching, setFetching] = useState<Fetching>(null);
  const choose = (language: UiLanguage) => {
    if (language === current) return;
    if (isBuiltIn(language) || isPackCurrent(language)) return restartIn(language);
    setFetching("hämtar");
    void fetchPack(platform.webFetch, language)
      .then(() => restartIn(language))
      .catch((error: unknown) => (recordFailure("Språket")(error), setFetching("misslyckades")));
  };
  return (
    <>
      <Dropdown label={t("Språk")} value={current} options={UI_LANGUAGES} onSelect={choose} />
      {fetching === "hämtar" && <span className="setting-hint">{t("Hämtar språket…")}</span>}
      {fetching === "misslyckades" && (
        <span className="setting-hint">
          {t("Språket kunde inte hämtas. Försök igen när du har nät.")}
        </span>
      )}
    </>
  );
}
