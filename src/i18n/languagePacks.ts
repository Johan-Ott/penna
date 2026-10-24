import { browserStorage } from "@llkit/storage/browserStorage.js";
import type { UiLanguage } from "@llkit/i18n.js";

// The languages beyond Swedish and English are fetched the first time they are chosen, as the
// spelling dictionaries are, from src/i18n/packs in the release this version was made from.

const keyOf = (language: UiLanguage) => `skrivro.uiLanguage.${language}`;

const urlOf = (language: UiLanguage, version: string) =>
  `https://cdn.jsdelivr.net/gh/Johan-Ott/skrivro@${version}/src/i18n/packs/${language}.json`;

interface Kept {
  version: string;
  texts: Record<string, string>;
}

/** The language's texts as last fetched, for any version, or null. */
export function keptPack(language: UiLanguage): Kept | null {
  try {
    const kept = JSON.parse(browserStorage().getItem(keyOf(language)) ?? "null") as Kept | null;
    return kept && typeof kept.texts === "object" ? kept : null;
  } catch {
    return null;
  }
}

// This version's release first; a version not yet released, as while developing, reads main.
async function fetchTexts(fetcher: typeof fetch, language: UiLanguage) {
  for (const version of [`v${__APP_VERSION__}`, "main"]) {
    const response = await fetcher(urlOf(language, version)).catch(() => null);
    if (response?.ok) return (await response.json()) as Record<string, string>;
  }
  throw new Error(`Språket ${language} kunde inte hämtas.`);
}

/** Fetches the language's texts for this version and keeps them; throws when it cannot. */
export async function fetchPack(fetcher: typeof fetch, language: UiLanguage) {
  const texts = await fetchTexts(fetcher, language);
  browserStorage().setItem(keyOf(language), JSON.stringify({ version: __APP_VERSION__, texts }));
}

/** True when the kept texts are this version's, so nothing needs fetching. */
export const isPackCurrent = (language: UiLanguage) =>
  keptPack(language)?.version === __APP_VERSION__;
