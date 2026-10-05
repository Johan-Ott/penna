import { describe, expect, it } from "vitest";
import {
  codeFrom,
  exchangeCode,
  keyChallenge,
  refreshAccess,
  signInUrl,
  tokenCache,
} from "../src/sync/googleAuth";

const client = { id: "ID.apps.googleusercontent.com", secret: "SECRET" };

function fakeFetch(body: unknown, status = 200) {
  const calls: { url: string; body: string }[] = [];
  const fetcher = (async (url: string, init: RequestInit = {}) => {
    calls.push({ url, body: String(init.body) });
    return new Response(JSON.stringify(body), { status });
  }) as unknown as typeof fetch;
  return { calls, fetcher };
}

describe("googleAuth", () => {
  it("asks only for the files Penna makes, with a challenge and room for the address", async () => {
    const { verifier, challenge } = await keyChallenge();

    const url = signInUrl(client, challenge, "S1");

    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(challenge).not.toContain("=");
    expect(url).toContain("scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive.file");
    expect(url).toContain("code_challenge_method=S256");
    expect(url).toContain("access_type=offline");
    expect(url.endsWith("&redirect_uri={redirect}")).toBe(true);
  });

  it("takes the code from Google's answer only when the state matches", () => {
    expect(codeFrom("code=C1&state=S1", "S1")).toBe("C1");
    expect(() => codeFrom("code=C1&state=X", "S1")).toThrow();
    expect(() => codeFrom("error=access_denied&state=S1", "S1")).toThrow();
  });

  it("trades the code for an access key and a lasting key", async () => {
    const { calls, fetcher } = fakeFetch({
      access_token: "A1",
      refresh_token: "R1",
      expires_in: 3600,
    });

    const answer = await exchangeCode(
      fetcher,
      client,
      { code: "C1", verifier: "V1", redirect: "http://127.0.0.1:5000" },
      1000,
    );

    expect(answer).toEqual({ access: { token: "A1", expiresAt: 3_601_000 }, lastingKey: "R1" });
    expect(calls[0]?.url).toBe("https://oauth2.googleapis.com/token");
    expect(calls[0]?.body).toContain("code_verifier=V1");
    expect(calls[0]?.body).toContain("grant_type=authorization_code");
  });

  it("reports a lasting key Google no longer accepts", async () => {
    const { fetcher } = fakeFetch({ error: "invalid_grant" }, 400);

    await expect(refreshAccess(fetcher, client, "R1", 0)).rejects.toThrow("invalid_grant");
  });

  it("reuses an access key until a minute before it runs out", async () => {
    let now = 0;
    let fetched = 0;
    const token = tokenCache(
      async () => {
        fetched += 1;
        return { token: `A${fetched}`, expiresAt: now + 3_600_000 };
      },
      () => now,
    );

    expect(await token()).toBe("A1");
    now = 3_000_000;
    expect(await token()).toBe("A1");
    now = 3_550_000;
    expect(await token()).toBe("A2");
  });
});
