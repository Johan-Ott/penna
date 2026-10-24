// `node scripts/make-installer-splash.mjs`: the installer's and uninstaller's pictures, from
// src-tauri/windows/splash.html and uninstall.html, as BMP since that is all NSIS shows.
import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

const folder = resolve("src-tauri/windows");
const PICTURES = [
  ["splash.html", "splash"],
  ["uninstall.html?lang=sv&check=off", "uninstall-sv-off"],
  ["uninstall.html?lang=sv&check=on", "uninstall-sv-on"],
  ["uninstall.html?lang=en&check=off", "uninstall-en-off"],
  ["uninstall.html?lang=en&check=on", "uninstall-en-on"],
];

const browser = await chromium.launch();
for (const [source, name] of PICTURES) {
  for (const [scale, suffix] of [
    [1, ""],
    [2, "@2x"],
  ]) {
    const page = await browser.newPage({
      viewport: { width: 440, height: 300 },
      deviceScaleFactor: scale,
    });
    const [file, query = ""] = source.split("?");
    await page.goto(`${pathToFileURL(resolve(folder, file)).href}${query ? `?${query}` : ""}`);
    await page.waitForLoadState("networkidle");
    const png = resolve(folder, `${name}${suffix}.png`);
    await page.screenshot({ path: png });
    const bmp = resolve(folder, `${name}${suffix}.bmp`);
    execFileSync("powershell.exe", [
      "-NoProfile",
      "-Command",
      `Add-Type -AssemblyName System.Drawing; $i = [System.Drawing.Image]::FromFile('${png}'); $i.Save('${bmp}', [System.Drawing.Imaging.ImageFormat]::Bmp); $i.Dispose()`,
    ]);
    rmSync(png);
    process.stdout.write(`${bmp}\n`);
    await page.close();
  }
}
await browser.close();
