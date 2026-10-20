// The store pictures put together: a caption in the website's type over a screen from
// storeImages.mjs, on the website's paper.
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const font = (file) => pathToFileURL(resolve(`public/fonts/${file}`)).href;
const dataUrl = (file) => `data:image/png;base64,${readFileSync(file).toString("base64")}`;
const sheet = (width, height, body) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: Literata; font-weight: 700; src: url("${font("literata-700-normal.ttf")}"); }
@font-face { font-family: Literata; font-weight: 400; src: url("${font("literata-400-normal.ttf")}"); }
html, body { margin: 0; width: ${width}px; height: ${height}px; overflow: hidden; }
body { position: relative; font-family: Literata, Georgia, serif; color: #111;
  background: radial-gradient(circle at 12% 8%, #f6e3d4 0, transparent 38%),
    radial-gradient(circle at 92% 30%, #e9ece8 0, transparent 40%), #fbf9f5; }
h1 { position: absolute; left: 0; right: 0; margin: 0 auto; text-align: center; font-weight: 700;
  letter-spacing: -0.01em; line-height: 1.15; }
.frame { position: absolute; left: 50%; transform: translateX(-50%); overflow: hidden;
  background: #111; box-shadow: 0 40px 90px rgba(40, 30, 20, 0.22); }
.frame img { display: block; width: 100%; }
</style></head><body>${body}</body></html>`;

const phonePicture = (caption, file) =>
  sheet(
    1080,
    1920,
    `<h1 style="top:120px;width:900px;font-size:70px">${caption}</h1>
  <div class="frame" style="top:340px;width:760px;border:16px solid #111;border-radius:72px">
  <img style="border-radius:56px" src="${dataUrl(file)}"></div>`,
  );

const deskPicture = (caption, file) =>
  sheet(
    1920,
    1080,
    `<h1 style="top:70px;width:1500px;font-size:64px">${caption}</h1>
  <div class="frame" style="top:210px;width:1560px;border-radius:22px;border:1px solid #e3ded6">
  <img src="${dataUrl(file)}"></div>`,
  );

const banner = (caption) =>
  sheet(
    1024,
    500,
    `<img src="${dataUrl("src-tauri/icons/icon-source.png")}"
  style="position:absolute;left:84px;top:110px;width:280px">
  <div style="position:absolute;left:400px;top:150px;width:600px">
  <div style="font-size:84px;font-weight:700">Skrivro</div>
  <div style="font-size:36px;line-height:1.3;margin-top:14px;color:#3d3a35">${caption}</div></div>`,
  );

export async function render(browser, html, size, out) {
  const tab = await browser.newPage({ viewport: size });
  await tab.setContent(html, { waitUntil: "networkidle" });
  await tab.screenshot({ path: out });
  await tab.close();
}

export async function compose(browser, lang, shots, raw) {
  const dir = `out/store/${lang}`;
  mkdirSync(dir, { recursive: true });
  for (const [index, [name, swedish, english]] of shots.entries()) {
    const caption = lang === "sv" ? swedish : english;
    const prefix = `${dir}/${index + 1}-${name}`;
    const phoneSize = { width: 1080, height: 1920 };
    await render(
      browser,
      phonePicture(caption, `${raw}/telefon-${name}.png`),
      phoneSize,
      `${prefix}-telefon.png`,
    );
    const deskSize = { width: 1920, height: 1080 };
    await render(
      browser,
      deskPicture(caption, `${raw}/dator-${name}.png`),
      deskSize,
      `${prefix}-dator.png`,
    );
  }
  const tagline =
    lang === "sv" ? "Ett lugnt ställe att skriva din bok." : "A calm place to write your book.";
  await render(browser, banner(tagline), { width: 1024, height: 500 }, `${dir}/play-banner.png`);
}

// The bun's swirl: a spiral wound out from the middle, as one path.
const swirl = (turns, outer) =>
  [...Array(turns * 36 + 1).keys()]
    .map((step) => {
      const angle = (step / 36) * 2 * Math.PI;
      const radius = (outer * step) / (turns * 36);
      return `${step ? "L" : "M"}${(radius * Math.cos(angle)).toFixed(1)} ${(radius * Math.sin(angle)).toFixed(1)}`;
    })
    .join(" ");

const SUGAR = [
  [-150, -210],
  [60, -250],
  [210, -120],
  [-250, 20],
  [240, 90],
  [-120, 230],
  [110, 210],
  [-20, -60],
];

// The cover of the pictures' book, Kanelbullemordet, so the finished book looks like one.
export const bookCover = () =>
  sheet(
    1600,
    2560,
    `<div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 52%, #f8e4d3 0, #eccfb6 70%)"></div>
  <div style="position:absolute;top:210px;width:100%;text-align:center;font-size:58px;letter-spacing:0.3em;color:#a85a2e">EN MYSDECKARE</div>
  <h1 style="top:340px;width:1400px;font-size:230px;line-height:1;color:#0b4a37">Kanelbulle&shy;mordet</h1>
  <svg viewBox="-400 -400 800 800" style="position:absolute;left:400px;top:1150px;width:800px">
    <circle r="340" fill="#c98a55"/>
    <path d="${swirl(4, 300)}" fill="none" stroke="#8a4b24" stroke-width="30" stroke-linecap="round"/>
    ${SUGAR.map(([x, y]) => `<rect x="${x}" y="${y}" width="34" height="26" rx="9" fill="#fbf7f0"/>`).join("")}
  </svg>
  <div style="position:absolute;bottom:200px;width:100%;text-align:center;font-size:76px;letter-spacing:0.22em;color:#0b4a37">GRETA LIND</div>`,
  );

// Play rounds the icon itself, so its 512 × 512 is the logo's paper all the way to the edges.
export const playIcon = () =>
  sheet(
    512,
    512,
    `<div style="position:absolute;inset:0;background:#0e6b4f"></div>
  <img src="${dataUrl("src-tauri/icons/icon-source.png")}"
  style="position:absolute;left:-56px;top:-56px;width:624px">`,
  );
