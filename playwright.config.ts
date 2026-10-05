import { defineConfig } from "@playwright/test";

// The flows run against the browser version, which opens the example project in memory.
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: { baseURL: "http://127.0.0.1:1420", locale: "sv-SE" },
  webServer: {
    command: "npm run dev:web -- --host 127.0.0.1",
    url: "http://127.0.0.1:1420",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
