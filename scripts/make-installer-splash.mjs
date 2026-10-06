// `node scripts/make-installer-splash.mjs`: the installer's window as bitmaps, from
// src-tauri/windows/splash.html. NSIS shows only BMP, so Windows turns the screenshots into BMP.
import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

const folder = resolve("src-tauri/windows");
const browser = await chromium.launch();
for (const [scale, name] of [
  [1, "splash"],
  [2, "splash@2x"],
]) {
  const page = await browser.newPage({
    viewport: { width: 440, height: 300 },
    deviceScaleFactor: scale,
  });
  await page.goto(pathToFileURL(resolve(folder, "splash.html")).href);
  await page.waitForLoadState("networkidle");
  const png = resolve(folder, `${name}.png`);
  await page.screenshot({ path: png });
  const bmp = resolve(folder, `${name}.bmp`);
  execFileSync("powershell.exe", [
    "-NoProfile",
    "-Command",
    `Add-Type -AssemblyName System.Drawing; $i = [System.Drawing.Image]::FromFile('${png}'); $i.Save('${bmp}', [System.Drawing.Imaging.ImageFormat]::Bmp); $i.Dispose()`,
  ]);
  rmSync(png);
  process.stdout.write(`${bmp}\n`);
}
await browser.close();
