import { expect, test, type Page } from "@playwright/test";
import { openExample } from "./helpers";

// A phone: a finger instead of a mouse, so rows swipe and a held finger opens menus.
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

async function finger(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  const touch = (type: "touchStart" | "touchMove" | "touchEnd", x: number, y: number) =>
    cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: type === "touchEnd" ? [] : [{ x, y }],
    });
  return {
    hold: async (x: number, y: number) => {
      await touch("touchStart", x, y);
      await page.waitForTimeout(700);
      await touch("touchEnd", x, y);
    },
    swipe: async (x: number, y: number, distance: number) => {
      await touch("touchStart", x, y);
      for (let step = 1; step <= 6; step++) await touch("touchMove", x + (distance * step) / 6, y);
      await touch("touchEnd", x + distance, y);
    },
  };
}

const middleOf = async (page: Page, name: string) => {
  const box = await page.getByRole("treeitem").filter({ hasText: name }).first().boundingBox();
  if (!box) throw new Error(`${name} is not on screen`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

test("a finger held on a row opens the row's menu", async ({ page }) => {
  await openExample(page);
  const row = await middleOf(page, "Köket");

  await (await finger(page)).hold(row.x, row.y);

  await expect(page.getByRole("menuitem", { name: "Byt namn" })).toBeVisible();
});

test("a row swiped left goes to the trash, and Ångra brings it back", async ({ page }) => {
  await openExample(page);
  const row = await middleOf(page, "Isen");

  await (await finger(page)).swipe(row.x, row.y, -140);

  await expect(page.getByRole("status").filter({ hasText: "papperskorgen" })).toBeVisible();
  await page.getByRole("button", { name: "Ångra" }).click();
  await expect(page.getByRole("treeitem").filter({ hasText: "Isen" }).first()).toBeVisible();
});
