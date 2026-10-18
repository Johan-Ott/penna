import { appInfo } from "./appInfo.js";
import { uiLanguage } from "./i18n.js";
import { browserStorage } from "./storage/browserStorage.js";

// Release notes list the changes in Swedish, then under "### New" in English. Older ones wrote
// each change as "* Svenska | English". Anything that is not a list line is not shown.

const listLines = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim().match(/^[*-]\s+(.*)/)?.[1])
    .filter((change) => change !== undefined);

/** The changes in the notes, in the language the app is shown in. */
export function changesIn(notes: string) {
  const [swedish = "", english] = notes.split(/^###\s*New\s*$/m);
  if (english !== undefined) return listLines(uiLanguage() === "en" ? english : swedish);
  return listLines(notes).map((change) => {
    const [inSwedish = "", inEnglish] = change.split("|").map((part) => part.trim());
    return uiLanguage() === "en" && inEnglish ? inEnglish : inSwedish;
  });
}

// The notes of an update are kept when it is offered, so the new version can show them after
// the restart without asking anyone.
const key = () => `${appInfo().name.toLowerCase()}.updateNotes`;

export function keepNotes(version: string, notes: string) {
  browserStorage().setItem(key(), JSON.stringify({ version, notes }));
}

/** The kept notes, if they are for this version. */
export function keptNotes(version: string) {
  try {
    const kept = JSON.parse(browserStorage().getItem(key()) ?? "{}") as {
      version?: string;
      notes?: string;
    };
    return kept.version === version ? (kept.notes ?? "") : "";
  } catch {
    return "";
  }
}
