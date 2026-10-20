import { recordFailure } from "@llkit/errorLog.js";
import { readAccount, type Account } from "../sync/accountSync.js";
import { googleDrive } from "../sync/googleDrive.js";
import { platform } from "./platform.js";
import type { PreferenceChange } from "./useStartup.js";

// Signing in with Google is the one account Skrivro has, and it is the writer's own: books,
// profile and settings go to the Skrivro folder in their Drive and nowhere else.

type Update = (change: PreferenceChange) => void;

export async function signIn(updatePreferences: Update) {
  await platform.googleSignIn?.connect();
  updatePreferences((current) => ({ ...current, isDriveSyncOn: true }));
}

/** Signs in, and finds the account the writer already has from another device, if any. */
export async function signInToAccount(updatePreferences: Update): Promise<Account | null> {
  await signIn(updatePreferences);
  const google = platform.googleSignIn;
  if (!google) return null;
  return readAccount(googleDrive(google.accessToken, google.fetch)).catch(() => null);
}

export async function signOut(updatePreferences: Update) {
  updatePreferences((current) => ({ ...current, isDriveSyncOn: false }));
  await platform.googleSignIn?.disconnect().catch(recordFailure("Utloggning från Google"));
}
