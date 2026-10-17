import { DEMO_PROJECT_FILES } from "../demo/demoProject.js";
import { createBrowserPlatform } from "@llkit/platform/browser.js";
import type { Platform } from "./platform.js";

// The browser version pretends to be a computer with a home folder and the example project.
const HOME = "/Användare/Elin";

export const browserPlatform: Platform = createBrowserPlatform(HOME, {
  ...DEMO_PROJECT_FILES,
  [`${HOME}/OneDrive/desktop.ini`]: "",
  [`${HOME}/Dokument/desktop.ini`]: "",
});
