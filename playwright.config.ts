import { defineConfig } from "@playwright/test";

// The flows run against the browser version, which opens the example project in memory.
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  // One dev server serves every browser; more at once than this makes timing-sensitive steps flaky.
  workers: 8,
  expect: { timeout: 15_000 },
  use: { baseURL: "http://127.0.0.1:1420", locale: "sv-SE" },
  webServer: {
    command: "npm run dev:web -- --host 127.0.0.1",
    url: "http://127.0.0.1:1420",
    reuseExistingServer: true,
    // A pretend address, so the flows send feedback the same way whatever .env.local holds.
    env: { VITE_FEEDBACK_URL: "https://formspree.io/f/prov" },
    timeout: 60_000,
  },
});
