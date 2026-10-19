import { createStore } from "./store.js";
import { device } from "./platform/device.js";
import type { AppUpdate } from "./platform/types.js";

// The update Skrivro has found, shared by the notice and the menus' Sök efter uppdateringar.

interface Updates {
  update: AppUpdate | null;
  /** Asked by hand and nothing newer was found, so the writer is told so. */
  isLatest: boolean;
}

const updates = createStore<Updates>({ update: null, isLatest: false });

/** Quiet offline or failing; asked by hand, "nothing newer" is said too. */
export async function checkForUpdates(isAsked = false) {
  const update = await device()
    .checkForUpdate()
    .catch(() => null);
  updates.set({ update, isLatest: isAsked && !update });
}

export const dismissUpdates = () => updates.set({ update: null, isLatest: false });

export const useUpdates = updates.use;
