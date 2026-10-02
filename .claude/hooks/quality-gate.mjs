import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const OUTPUT_LINES_SHOWN = 60;
const WATCHED_PATHS = ["src", "tests", "scripts", "package.json", "eslint.config.js"];

function readStandardInput() {
  return new Promise((resolve) => {
    let received = "";
    process.stdin.on("data", (chunk) => (received += chunk));
    process.stdin.on("end", () => resolve(received));
  });
}

function hasWatchedChanges() {
  const result = spawnSync("git", ["status", "--porcelain", "--", ...WATCHED_PATHS], {
    encoding: "utf8",
  });
  if (result.status !== 0) return true;
  return result.stdout.trim().length > 0;
}

function runCheck() {
  return spawnSync("npm", ["run", "check"], { encoding: "utf8", shell: true, timeout: 200_000 });
}

function lastLines(text) {
  return text.trim().split("\n").slice(-OUTPUT_LINES_SHOWN).join("\n");
}

async function main() {
  const input = JSON.parse((await readStandardInput()) || "{}");
  if (input.stop_hook_active) return 0;
  process.chdir(process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
  if (!existsSync("node_modules") || !hasWatchedChanges()) return 0;

  const result = runCheck();
  if (result.status === 0) return 0;

  const output = `${result.stdout}\n${result.stderr}`;
  process.stderr.write(
    `npm run check failed. Fix the causes, then stop.\n\n${lastLines(output)}\n`,
  );
  return 2;
}

process.exit(await main());
