// `node scripts/drive-app.mjs steps.mjs`: runs `export default async ({ page }) => …` in Penna
// Test. Answers for file dialogs and questions go in window.pennaTest first.
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const [, , stepsFile] = process.argv;
if (!stepsFile) throw new Error("Usage: node scripts/drive-app.mjs steps.mjs");
const browser = await chromium.connectOverCDP("http://127.0.0.1:9333");
const [page] = browser.contexts()[0]?.pages() ?? [];
if (!page) throw new Error("Penna Test is not running: npm run app:test");
const { default: steps } = await import(pathToFileURL(resolve(stepsFile)).href);
const result = await steps({ page });
if (result !== undefined) {
  process.stdout.write(`${typeof result === "string" ? result : JSON.stringify(result, null, 2)}
`);
}
await browser.close().catch(() => undefined);
