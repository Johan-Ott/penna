// `node scripts/penna.mjs [--app] [--book <bokmapp>] <call> [args…]`, or `new <bibliotek> <titel>
// [fil.md]` for a new book: the answer as JSON. The calls are listed in docs/styrning.md.
//
// With --book the call goes through Penna when it has that book open, so the app's own state
// and the files never part; otherwise straight on the book's files, Penna running or not.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { chromium } from "@playwright/test";

const argv = process.argv.slice(2);
const bookAt = argv.indexOf("--book");
const book = bookAt >= 0 ? argv[bookAt + 1] : null;
const isApp = argv.includes("--app");
const isBookArg = (index) => bookAt >= 0 && (index === bookAt || index === bookAt + 1);
const rest = argv.filter((arg, index) => arg !== "--app" && !isBookArg(index));
const [call, ...args] = rest;
if (!call) throw new Error("Usage: node scripts/penna.mjs [--app] [--book <mapp>] <call> [args…]");

// --app reaches the real Penna, once Styr Penna från den här datorn is on; else Penna Test.
const port = isApp ? "9334" : "9333";
const samePath = (one, other) =>
  resolve(one).replaceAll("\\", "/").toLowerCase() ===
  resolve(other).replaceAll("\\", "/").toLowerCase();

async function openPage() {
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`, { timeout: 2000 });
  const [page] = browser.contexts()[0]?.pages() ?? [];
  return page ? { browser, page } : (await browser.close(), null);
}

// write takes its text from a file, and batch its calls from a JSON file.
function valuesFor(name, given) {
  if (name === "batch" && given[0]) return [JSON.parse(readFileSync(given[0], "utf8"))];
  if (name === "write" && given[1]) return [given[0], readFileSync(given[1], "utf8")];
  return given;
}

async function throughApp() {
  const opened = await openPage().catch(() => null);
  if (!opened) return { isDone: false };
  const { browser, page } = opened;
  const state = await page.evaluate(() => globalThis.penna?.state?.() ?? null);
  if (book && !(state?.dir && samePath(state.dir, book)))
    return browser.close().then(() => ({ isDone: false }));
  const values = valuesFor(call, args);
  const answer = await page.evaluate(
    ([name, given]) => globalThis.penna?.[name]?.(...given) ?? `No call named ${name}`,
    [call, values],
  );
  await browser.close().catch(() => undefined);
  return { isDone: true, answer };
}

function runScript(script, scriptArgs) {
  const here = fileURLToPath(new URL(script, import.meta.url));
  const loader = new URL("./ts-loader.mjs", import.meta.url).href;
  const result = spawnSync(process.execPath, ["--import", loader, here, ...scriptArgs], {
    stdio: "inherit",
  });
  process.exitCode = result.status ?? 1;
}

async function runCall() {
  if (call === "new") return runScript("./new-book.ts", args);
  const viaApp = await throughApp();
  if (viaApp.isDone) {
    process.stdout.write(`${JSON.stringify(viaApp.answer ?? null, null, 2)}\n`);
    return;
  }
  if (!book)
    throw new Error(`No Penna on port ${port}, and no --book to work on the files instead.`);
  runScript("./book.ts", [book, call, ...args]);
}

await runCall();
