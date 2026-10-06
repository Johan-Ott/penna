// `npm run app:test`: the real app as Penna Test, with its own books and sign-in, its WebView
// open on port 9333 for scripts/drive-app.mjs. A running dev server on 1420 is reused.
import { spawn } from "node:child_process";
import { connect } from "node:net";

const DEV = "http://127.0.0.1:1420";
const isServing = await new Promise((done) => {
  const socket = connect(1420, "127.0.0.1", () => (socket.end(), done(true)));
  socket.on("error", () => done(false));
});
const build = {
  devUrl: DEV,
  beforeDevCommand: isServing ? "" : "npm run dev:web -- --host 127.0.0.1",
};
const args = ["tauri", "dev", "--config", "src-tauri/tauri.test.conf.json"];
args.push("--config", JSON.stringify({ build }));
spawn("npx", args, {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: "--remote-debugging-port=9333" },
});
