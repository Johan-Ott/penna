// `npm run icons`: desktop, Android and in-app icons from src-tauri/icons/icon-source.png
// (square, transparent background).
import { spawnSync } from "node:child_process";
import { cpSync, copyFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SOURCE = "src-tauri/icons/icon-source.png";
const TARGET = "src-tauri/icons";
// Tauri also makes iOS and Windows Store icons; those wait until Penna is built for them.
const KEPT = ["icon.ico", "icon.png", "icon.icns", "32x32.png", "128x128.png"];

const workDir = mkdtempSync(join(tmpdir(), "penna-icons-"));
const result = spawnSync("npx", ["tauri", "icon", SOURCE, "-o", workDir], {
  stdio: "inherit",
  shell: true,
});
if (result.status === 0) {
  for (const name of KEPT) copyFileSync(join(workDir, name), join(TARGET, name));
  rmSync(join(TARGET, "android"), { recursive: true, force: true });
  cpSync(join(workDir, "android"), join(TARGET, "android"), { recursive: true });
  copyFileSync(join(workDir, "128x128@2x.png"), "src/assets/penna-logo.png");
  process.stdout.write(`Updated the icons in ${TARGET} and src/assets/penna-logo.png\n`);
}
rmSync(workDir, { recursive: true, force: true });
process.exit(result.status ?? 1);
