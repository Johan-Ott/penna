// `npm run app:test`: the real app as Skrivro Test, with its own books and sign-in, its WebView
// open on port 9333 for scripts/drive-app.mjs. A running dev server on 1420 is reused.
import { spawn } from "node:child_process";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import { connect } from "node:net";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { appFolders } from "./platformFolders.mjs";

const DEV = "http://127.0.0.1:1420";
const TEST_ID = "se.skrivro.test";

// `-- --ny` starts it as new, onboarding and all; only Skrivro Test's own folders are removed.
if (process.argv.includes("--ny")) {
  const folders = appFolders(process.platform, process.env, homedir(), TEST_ID);
  const found = folders.filter(existsSync);
  for (const folder of found) rmSync(folder, { recursive: true, force: true });
  process.stdout.write(
    found.length
      ? "Skrivro Test börjar som ny: dess böcker och inställningar är borta.\n"
      : "Skrivro Test hade inget att ta bort, så den börjar som ny.\n",
  );
}
const isServing = await new Promise((done) => {
  const socket = connect(1420, "127.0.0.1", () => (socket.end(), done(true)));
  socket.on("error", () => done(false));
});
const build = {
  devUrl: DEV,
  beforeDevCommand: isServing ? "" : "npm run dev:web -- --host 127.0.0.1",
};
const args = ["tauri", "dev", "--config", "src-tauri/tauri.test.conf.json"];
// A file, since the shell would strip the quotes of JSON given on the command line.
const extra = join(tmpdir(), "penna-test-build.json");
writeFileSync(extra, JSON.stringify({ build }));
args.push("--config", extra);
spawn("npx", args, {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: "--remote-debugging-port=9333" },
});
