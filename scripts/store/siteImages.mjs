// `node scripts/store/siteImages.mjs`: the pictures in site/bilder, taken from the web build on
// http://127.0.0.1:1420 (npm run dev:web) with the example book Vintervägen.
import { chromium } from "@playwright/test";

const APP = "http://127.0.0.1:1420/";
const OUT = "site/bilder";
const KOKET = "01J9Z4K2QX0000000000000001";
const ARVID = "01J9Z4K2QX0000000000000005";

async function openExample(browser, { viewport, scale = 1, colorScheme = "light" }) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: scale, colorScheme });
  await page.addInitScript(() => {
    globalThis.localStorage.setItem("skrivro.app", JSON.stringify({ isOnboardingDone: true }));
    globalThis.localStorage.setItem("skrivro.guide", JSON.stringify({ isOff: true }));
  });
  await page.goto(APP);
  await page.getByRole("button", { name: "Prova exempelboken" }).click();
  await page.locator(".ProseMirror").waitFor({ state: "attached" });
  await page.waitForTimeout(1200);
  // An award earned while the example opens is the app's, not the picture's.
  await page.addStyleTag({ content: ".celebrations { display: none !important; }" });
  return page;
}

const open = (page, id) => page.evaluate((nodeId) => globalThis.skrivro.open(nodeId), id);

// Does what leads to a screen, lets it settle, and keeps it.
async function capture(page, file, action) {
  await action();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${file}`, ...(file.endsWith(".jpg") && { quality: 88 }) });
}

const SYNOPSIS = `Elin återvänder till ön en vinter då isen bär, för att tömma sin döda mosters hus. På köksbordet ligger ett brev, skrivet fyrtio år tidigare, som ingen skulle öppna förrän isen släppt.

När hon börjar fråga runt visar sig farbror Arvid veta mer än han säger, och fyren som släcktes 1987 blir nyckeln till vad som hände den natten.

I slutet förstår Elin att brevet var till henne.`;

const desk = { viewport: { width: 1440, height: 900 } };
const browser = await chromium.launch();

for (const [colorScheme, file] of [
  ["light", "skriv.jpg"],
  ["dark", "skriv-mork.jpg"],
]) {
  const page = await openExample(browser, { ...desk, scale: 2, colorScheme });
  await capture(page, file, () => open(page, KOKET));
  await page.close();
}

const page = await openExample(browser, desk);
await capture(page, "person.png", () => open(page, ARVID));
await capture(page, "granska.png", async () => {
  await open(page, KOKET);
  await page.waitForTimeout(600);
  await page
    .getByRole("button", { name: /^Granska/ })
    .first()
    .click();
});
await capture(page, "las.png", async () => {
  await page.getByRole("button", { name: "Stäng granskning" }).click();
  await page.getByRole("button", { name: "Läs kapitlet" }).click();
});
await capture(page, "publicera.png", async () => {
  await page.keyboard.press("Escape");
  await page.getByRole("tab", { name: "Publicera" }).click();
  await page.getByText("Sätter boken").waitFor({ state: "detached" });
});
await capture(page, "forlag.png", async () => {
  await page.getByRole("button", { name: /^Till förlag/ }).click();
  await page.getByRole("textbox").first().fill(SYNOPSIS);
});
await page.close();

const phone = await openExample(browser, { viewport: { width: 390, height: 844 } });
await capture(phone, "telefon.png", async () => {});
await browser.close();
process.stdout.write(`Klart: ${OUT}\n`);
