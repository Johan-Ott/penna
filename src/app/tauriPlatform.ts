import { getCurrentWindow } from "@tauri-apps/api/window";
import { ask, open } from "@tauri-apps/plugin-dialog";
import { watch } from "@tauri-apps/plugin-fs";
import { tauriFileSystem } from "../storage/tauriFileSystem.js";
import type { Platform } from "./platform.js";

const askToCloseAnyway = () =>
  ask("Scenen kunde inte sparas. Stänger du nu försvinner det du skrivit sedan senaste sparning.", {
    title: "Osparad text",
    kind: "warning",
    okLabel: "Stäng ändå",
    cancelLabel: "Fortsätt skriva",
  });

export const tauriPlatform: Platform = {
  fileSystem: tauriFileSystem,
  isDemo: false,

  async pickFolder() {
    const picked = await open({ directory: true });
    return typeof picked === "string" ? picked.replaceAll("\\", "/") : null;
  },

  watchFolder: (dir, onChange) => watch(dir, onChange, { recursive: true, delayMs: 300 }),

  guardClose(isSafeToClose) {
    const appWindow = getCurrentWindow();
    const stopListening = appWindow.onCloseRequested(async (event) => {
      if (await isSafeToClose()) return;
      event.preventDefault();
      if (await askToCloseAnyway()) await appWindow.destroy();
    });
    return () => void stopListening.then((stop) => stop());
  },
};
