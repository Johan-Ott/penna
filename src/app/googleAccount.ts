import { recordFailure } from "./errorLog.js";
import { platform } from "./platform.js";
import { createStore } from "./store.js";
import type { PreferenceChange } from "./useStartup.js";

// Signing in with Google is the one account Penna has, and it is the writer's own: books,
// profile and settings go to the Penna folder in their Drive and nowhere else.

type Update = (change: PreferenceChange) => void;

/** True from a sign-in until the shelf has asked which books to fetch. */
export const booksAsked = createStore(false);

export async function signIn(updatePreferences: Update) {
  await platform.googleSignIn?.connect();
  updatePreferences((current) => ({ ...current, isDriveSyncOn: true }));
  booksAsked.set(true);
}

export async function signOut(updatePreferences: Update) {
  updatePreferences((current) => ({ ...current, isDriveSyncOn: false }));
  await platform.googleSignIn?.disconnect().catch(recordFailure("Utloggning från Google"));
}
