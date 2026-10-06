// `node scripts/drive-app.mjs steps.mjs`: runs `export default async ({ page }) => …` in Penna
// Test, or with `--android` in the emulator's Penna (npm run build:android -- --emulator).
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { _android as android, chromium } from "@playwright/test";

const [stepsFile] = process.argv.slice(2).filter((argument) => !argument.startsWith("--"));
if (!stepsFile) throw new Error("Usage: node scripts/drive-app.mjs [--android] steps.mjs");

// Android's WebView answers only through adb, so the emulator is reached as a device.
async function connect() {
  if (process.argv.includes("--android")) {
    const [device] = await android.devices();
    if (!device) throw new Error("No emulator: start it and npm run build:android -- --emulator");
    const webView = await device.webView({ pkg: "se.penna.app" });
    return { page: await webView.page(), close: () => device.close() };
  }
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9333");
  const [page] = browser.contexts()[0]?.pages() ?? [];
  if (!page) throw new Error("Penna Test is not running: npm run app:test");
  return { page, close: () => browser.close() };
}

const { page, close } = await connect();
const { default: steps } = await import(pathToFileURL(resolve(stepsFile)).href);
const result = await steps({ page });
if (result !== undefined) {
  const shown = typeof result === "string" ? result : JSON.stringify(result, null, 2);
  process.stdout.write(`${shown}\n`);
}
await close().catch(() => undefined);
