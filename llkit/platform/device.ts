import type { BasePlatform } from "./types.js";

// The device the app runs on, as the app built it, for llkit's own parts such as the window's
// buttons. The app hands it in once, as it starts, before anything is drawn.

let current: BasePlatform | null = null;

export function provideDevice(platform: BasePlatform) {
  current = platform;
}

/** The app's platform; using it before the app has handed it in is a mistake in the app. */
export function device(): BasePlatform {
  if (!current) throw new Error("llkit: the app has not handed in its platform yet");
  return current;
}
