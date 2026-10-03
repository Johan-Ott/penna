import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SOURCE = "src-tauri/icons/icon-source.svg";
const TARGET = "src-tauri/icons";
// Tauri also makes Android, iOS and Windows Store icons; the desktop app needs only these.
const KEPT = ["icon.ico", "icon.png", "icon.icns", "32x32.png", "128x128.png"];

const workDir = mkdtempSync(join(tmpdir(), "penna-icons-"));
const result = spawnSync("npx", ["tauri", "icon", SOURCE, "-o", workDir], {
  stdio: "inherit",
  shell: true,
});
if (result.status === 0) {
  for (const name of KEPT) copyFileSync(join(workDir, name), join(TARGET, name));
  process.stdout.write(`Updated ${KEPT.length} icons in ${TARGET}\n`);
}
rmSync(workDir, { recursive: true, force: true });
process.exit(result.status ?? 1);
