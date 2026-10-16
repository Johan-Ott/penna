import { useEffect, useRef } from "react";
import { syncAccount, type Account } from "../sync/accountSync.js";
import { googleDrive } from "../sync/googleDrive.js";
import type { AppPreferences } from "./appPreferences.js";
import { browserStorage } from "./browserStorage.js";
import { recordFailure } from "./errorLog.js";
import { platform } from "./platform.js";
import { useProfile, type Profile } from "./profile/useProfile.js";
import type { PreferenceChange } from "./useStartup.js";

// The profile and the writer's own settings follow them to every device they sign in on. Each
// device dates its last change, and the newer side wins.

const CHANGED_KEY = "penna.account.changed";
const LAST_KEY = "penna.account.last";
const EVERY = 5 * 60_000;
const SOON = 2_000;

type Content = Omit<Account, "changedAt">;

const contentOf = (profile: Profile, preferences: AppPreferences): Content => ({
  profile: {
    about: profile.about,
    link: profile.link,
    picture: profile.picture,
    frame: profile.frame,
    title: profile.title,
  },
  settings: {
    authorName: preferences.authorName,
    defaultDailyGoal: preferences.defaultDailyGoal,
    isAutoSnapshotOn: preferences.isAutoSnapshotOn,
  },
});

// A change made here is dated now; the very first look at this device only remembers it.
function useDatedChanges(key: string, isLoaded: boolean) {
  useEffect(() => {
    if (!isLoaded) return;
    const storage = browserStorage();
    const last = storage.getItem(LAST_KEY);
    if (last === key) return;
    storage.setItem(LAST_KEY, key);
    if (last !== null) storage.setItem(CHANGED_KEY, String(Date.now()));
  }, [key, isLoaded]);
}

interface Input {
  profile: { profile: Profile; save: (profile: Profile) => void; isLoaded: boolean };
  preferences: AppPreferences;
  updatePreferences: (change: PreferenceChange) => void;
}

function useSyncRound(input: Input) {
  const latest = useRef(input);
  latest.current = input;
  return async () => {
    const signIn = platform.googleSignIn;
    if (!signIn) return;
    const { profile, preferences, updatePreferences } = latest.current;
    const storage = browserStorage();
    const changedAt = Number(storage.getItem(CHANGED_KEY) ?? 0);
    const local = { changedAt, ...contentOf(profile.profile, preferences) };
    const remote = await syncAccount(googleDrive(signIn.accessToken, signIn.fetch), local);
    if (!remote) return;
    const taken = { ...profile.profile, ...remote.profile };
    storage.setItem(
      LAST_KEY,
      JSON.stringify(contentOf(taken, { ...preferences, ...remote.settings })),
    );
    storage.setItem(CHANGED_KEY, String(remote.changedAt));
    profile.save(taken);
    updatePreferences((current) => ({ ...current, ...remote.settings }));
  };
}

/** Syncs Penna/konto.json while the writer is signed in: at once, soon after a change, and every
 * five minutes. */
function useAccountSync(input: Input) {
  const isOn = input.preferences.isDriveSyncOn && platform.googleSignIn !== undefined;
  const { isLoaded } = input.profile;
  const key = JSON.stringify(contentOf(input.profile.profile, input.preferences));
  useDatedChanges(key, isLoaded);
  const round = useSyncRound(input);
  const roundRef = useRef(round);
  roundRef.current = round;
  useEffect(() => {
    if (!isOn || !isLoaded) return;
    const run = () => void roundRef.current().catch(recordFailure("Profilen kunde inte synkas"));
    const soon = setTimeout(run, SOON);
    const every = setInterval(run, EVERY);
    return () => (clearTimeout(soon), clearInterval(every));
  }, [isOn, isLoaded, key]);
}

/** The profile in the Penna folder, kept in step with the writer's other devices. */
export function useSyncedProfile(startup: Omit<Input, "profile">) {
  const profile = useProfile(startup.preferences.libraryDir);
  useAccountSync({ ...startup, profile });
  return profile;
}
