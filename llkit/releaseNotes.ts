import { appInfo } from "./appInfo.js";
import { isSwedish } from "./i18n.js";
import { browserStorage } from "./storage/browserStorage.js";
import { isNewer } from "./platform/versions.js";

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
  if (english !== undefined) return listLines(isSwedish() ? swedish : english);
  return listLines(notes).map((change) => {
    const [inSwedish = "", inEnglish] = change.split("|").map((part) => part.trim());
    return !isSwedish() && inEnglish ? inEnglish : inSwedish;
  });
}

/** A published release as GitHub lists it. */
export interface Release {
  tag_name: string;
  body?: string | null;
  draft?: boolean;
}

/** Every change after `from` up to and including `to`, newest first: an update that skips a
 * version still tells what that version brought. */
export function changesSince(releases: Release[], from: string, to: string) {
  return releases
    .filter((release) => !release.draft && isNewer(release.tag_name, from))
    .filter((release) => !isNewer(release.tag_name, to))
    .sort((one, other) => (isNewer(one.tag_name, other.tag_name) ? -1 : 1))
    .flatMap((release) => changesIn(release.body ?? ""));
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
