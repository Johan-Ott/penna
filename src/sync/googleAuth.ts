// PKCE: a stolen code is useless without this sign-in's own secret word.

const SIGN_IN = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN = "https://oauth2.googleapis.com/token";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

/** A desktop client's secret is not truly secret; Google treats it so. */
export interface Client {
  id: string;
  secret: string;
}

/** `expiresAt` in ms since 1970. */
export interface Access {
  token: string;
  expiresAt: number;
}

const base64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");

export async function keyChallenge() {
  const verifier = base64Url(crypto.getRandomValues(new Uint8Array(48)));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return { verifier, challenge: base64Url(new Uint8Array(digest)) };
}

/** `{redirect}` is left for the app to fill with its one-time address. */
export function signInUrl(client: Client, challenge: string, state: string) {
  const params = new URLSearchParams({
    client_id: client.id,
    response_type: "code",
    scope: DRIVE_SCOPE,
    code_challenge: challenge,
    code_challenge_method: "S256",
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${SIGN_IN}?${params}&redirect_uri={redirect}`;
}

/** The answer must carry the state this sign-in sent. */
export function codeFrom(query: string, state: string) {
  const answer = new URLSearchParams(query);
  const code = answer.get("code");
  if (answer.get("state") !== state) throw new Error("Svaret kom inte från den här inloggningen");
  if (!code) throw new Error(answer.get("error") ?? "Google gav ingen kod");
  return code;
}

interface TokenAnswer {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
}

async function askForToken(fetcher: typeof fetch, form: Record<string, string>, now: number) {
  const response = await fetcher(TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(form).toString(),
  });
  const answer = (await response.json()) as TokenAnswer;
  if (!response.ok || !answer.access_token) throw new Error(answer.error ?? "Google svarade inte");
  const access = { token: answer.access_token, expiresAt: now + (answer.expires_in ?? 0) * 1000 };
  return { access, lastingKey: answer.refresh_token ?? null };
}

export async function exchangeCode(
  fetcher: typeof fetch,
  client: Client,
  sign: { code: string; verifier: string; redirect: string },
  now: number,
) {
  const form = {
    client_id: client.id,
    client_secret: client.secret,
    code: sign.code,
    code_verifier: sign.verifier,
    redirect_uri: sign.redirect,
    grant_type: "authorization_code",
  };
  const { access, lastingKey } = await askForToken(fetcher, form, now);
  if (!lastingKey) throw new Error("Google gav ingen bestående nyckel");
  return { access, lastingKey };
}

/** Fails with "invalid_grant" when access was taken back. */
export async function refreshAccess(
  fetcher: typeof fetch,
  client: Client,
  lastingKey: string,
  now: number,
) {
  const form = {
    client_id: client.id,
    client_secret: client.secret,
    refresh_token: lastingKey,
    grant_type: "refresh_token",
  };
  return (await askForToken(fetcher, form, now)).access;
}

/** Reuses the access key until a minute before it runs out. */
export function tokenCache(fetchNew: () => Promise<Access>, now: () => number) {
  let current: Access | null = null;
  return async () => {
    if (!current || current.expiresAt - 60_000 <= now()) current = await fetchNew();
    return current.token;
  };
}
