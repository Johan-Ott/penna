// `node scripts/penna.mjs <call> [args…]`: one call to window.penna in a running Penna, the
// answer as JSON. The calls are listed in CLAUDE.md, under Penna Test.
import { chromium } from "@playwright/test";

// --app reaches the real Penna, once Styr Penna från den här datorn is on; else Penna Test.
const isApp = process.argv.includes("--app");
const [call, ...args] = process.argv.slice(2).filter((arg) => arg !== "--app");
if (!call) throw new Error("Usage: node scripts/penna.mjs <call> [args…]");

const port = isApp ? "9334" : "9333";
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
const [page] = browser.contexts()[0]?.pages() ?? [];
if (!page) throw new Error(`No Penna on port ${port}`);
const answer = await page.evaluate(
  ([name, values]) => globalThis.penna?.[name]?.(...values) ?? `No call named ${name}`,
  [call, args],
);
process.stdout.write(`${JSON.stringify(answer ?? null, null, 2)}\n`);
await browser.close().catch(() => undefined);
