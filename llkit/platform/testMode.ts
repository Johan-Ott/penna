import { getIdentifier } from "@tauri-apps/api/app";

// An app's test build (an identifier ending in .test) keeps its own files and sign-in, and lets a
// test answer the system dialogs no test can click.

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
    appTest?: TestAnswers;
  }
}

/** What a test queued for the next dialog, or undefined to show the real one. */
export async function testPath() {
  return (await isTestBuild) ? window.appTest?.paths.shift() : undefined;
}

export async function testAsk() {
  return (await isTestBuild) ? window.appTest?.asks.shift() : undefined;
}
