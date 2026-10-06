import { getIdentifier } from "@tauri-apps/api/app";

// The test build (identifier se.penna.test) keeps its own books and sign-in, and lets a test
// answer the system dialogs no test can click; see npm run app:test.

export const isTestBuild = getIdentifier()
  .then((identifier) => identifier.endsWith(".test"))
  .catch(() => false);

interface TestAnswers {
  /** A path for the next file or folder dialog; null is Avbryt. */
  paths: (string | null)[];
  /** The next question's answer. */
  asks: boolean[];
}

declare global {
  interface Window {
    pennaTest?: TestAnswers;
  }
}

/** What a test queued for the next dialog, or undefined to show the real one. */
export async function testPath() {
  return (await isTestBuild) ? window.pennaTest?.paths.shift() : undefined;
}

export async function testAsk() {
  return (await isTestBuild) ? window.pennaTest?.asks.shift() : undefined;
}
