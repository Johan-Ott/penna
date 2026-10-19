import { isTauri } from "@tauri-apps/api/core";
import { provideAppName } from "@llkit/appInfo.js";
import { createBrowserPlatform } from "@llkit/platform/browser.js";
import { provideDevice } from "@llkit/platform/device.js";
import { createTauriPlatform } from "@llkit/platform/tauri.js";

// The device the app runs on: llkit's, for Tauri or the browser. An app adds its own parts here,
// as Skrivro adds its spelling check and Typst.
export const platform = isTauri()
  ? createTauriPlatform({ releases: "Johan-Ott/__APP_SLUG__" })
  : createBrowserPlatform("/Hem", {});

provideDevice(platform);
provideAppName("__APP_NAME__");
