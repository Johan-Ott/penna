import { invoke } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import { fetch as appFetch } from "@tauri-apps/plugin-http";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { AppUpdate, FileKind } from "./types.js";
import { isNewer } from "./versions.js";

// What only an Android phone does: share files through its share sheet, and fetch a newer APK.

const MIME: Record<string, string> = {
  png: "image/png",
  pdf: "application/pdf",
  epub: "application/epub+zip",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  zip: "application/zip",
  json: "application/json",
};

// As a list of bytes: the phone's bridge carries no raw body.
export async function shareFile(name: string, bytes: Uint8Array, mime: string) {
  await invoke("share_file", { name, mime, bytes: Array.from(bytes) });
}

// A phone has no "save as": what is saved goes to the share sheet, which can save it to Files.
export async function shareAsSave(name: string, bytes: Uint8Array, kind: FileKind) {
  await shareFile(name, bytes, MIME[kind.extension] ?? "application/octet-stream");
  return name;
}

interface Release {
  tag_name: string;
  assets: { name: string; browser_download_url: string }[];
}

/** Installed from the APK, an Android phone gets a newer one from the app's latest GitHub release,
 * `repository` such as "Johan-Ott/penna". */
export async function checkForAndroidUpdate(repository: string): Promise<AppUpdate | null> {
  const response = await appFetch(`https://api.github.com/repos/${repository}/releases/latest`);
  if (!response.ok) return null;
  const release = (await response.json()) as Release;
  const apk = release.assets.find((asset) => asset.name.endsWith(".apk"));
  if (!apk || !isNewer(release.tag_name, await getVersion())) return null;
  const version = release.tag_name.replace(/^v/, "");
  return { version, isDownload: true, install: () => openUrl(apk.browser_download_url) };
}
