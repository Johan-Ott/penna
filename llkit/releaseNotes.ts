import { appInfo } from "./appInfo.js";
import { uiLanguage } from "./i18n.js";
import { browserStorage } from "./storage/browserStorage.js";

// Release notes are lines of "* Svenska | English"; anything else in them is not shown.

/** The changes in the notes, in the language the app is shown in. */
export function changesIn(notes: string) {
  return notes
    .split("\n")
    .map((line) => line.trim().match(/^[*-]\s+(.*)/)?.[1])
    .filter((change) => change !== undefined)
    .map((change) => {
      const [swedish = "", english] = change.split("|").map((part) => part.trim());
      return uiLanguage() === "en" && english ? english : swedish;
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
