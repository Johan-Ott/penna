import { invoke } from "@tauri-apps/api/core";
import { fetch as appFetch } from "@tauri-apps/plugin-http";
import {
  codeFrom,
  exchangeCode,
  keyChallenge,
  refreshAccess,
  signInUrl,
  tokenCache,
  type Client,
} from "../sync/googleAuth.js";
import type { GoogleSignIn } from "./platform.js";

// Android needs no client id: Google knows the app by package name and signing key.
const COMPUTER: Client = {
  id: "1065620639017-4f8bpo212reisvg8fgnmru4cjhh5piqu.apps.googleusercontent.com",
  secret: import.meta.env.VITE_GOOGLE_COMPUTER_SECRET ?? "",
};

const fetcher = appFetch as typeof fetch;

/** Google Play keeps the sign-in and hands out fresh access keys. */
export const androidSignIn: GoogleSignIn = {
  connect: async () => void (await invoke("google_access_token", { interactive: true })),
  accessToken: () => invoke<string>("google_access_token", { interactive: false }),
  disconnect: async () => undefined,
  fetch: fetcher,
};

async function signInInBrowser() {
  if (!COMPUTER.secret) throw new Error("Den här versionen av Penna saknar Google-nyckeln");
  const { verifier, challenge } = await keyChallenge();
  const state = crypto.randomUUID();
  const answer = await invoke<{ redirect: string; query: string }>("sign_in_in_browser", {
    url: signInUrl(COMPUTER, challenge, state),
  });
  const code = codeFrom(answer.query, state);
  return exchangeCode(fetcher, COMPUTER, { code, verifier, redirect: answer.redirect }, Date.now());
}

// Kept in the system's password store, never in a file.
async function lastingKey() {
  const key = await invoke<string | null>("saved_google_key");
  if (!key) throw new Error("Inte inloggad");
  return key;
}

const accessToken = tokenCache(
  async () => refreshAccess(fetcher, COMPUTER, await lastingKey(), Date.now()),
  Date.now,
);

export const computerSignIn: GoogleSignIn = {
  connect: async () => {
    const { lastingKey: key } = await signInInBrowser();
    await invoke("save_google_key", { key });
  },
  accessToken,
  disconnect: async () => {
    const key = await invoke<string | null>("saved_google_key");
    await invoke("save_google_key", { key: null });
    if (!key) return;
    await fetcher("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: key }).toString(),
    });
  },
  fetch: fetcher,
};
