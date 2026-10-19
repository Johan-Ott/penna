import { recordFailure } from "@llkit/errorLog.js";
import { platform } from "./platform.js";
import type { PreferenceChange } from "./useStartup.js";

// Signing in with Google is the one account Skrivro has, and it is the writer's own: books,
// profile and settings go to the Skrivro folder in their Drive and nowhere else.

type Update = (change: PreferenceChange) => void;

export async function signIn(updatePreferences: Update) {
  await platform.googleSignIn?.connect();
  updatePreferences((current) => ({ ...current, isDriveSyncOn: true }));
}

export async function signOut(updatePreferences: Update) {
  updatePreferences((current) => ({ ...current, isDriveSyncOn: false }));
  await platform.googleSignIn?.disconnect().catch(recordFailure("Utloggning från Google"));
}
