import { Bookmark, Document, Packer, Paragraph, TextRun } from "docx";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { editor, openExample } from "./helpers";

const KOKET = "01J9Z4K2QX0000000000000001";

// The example's first scene as an editor might send it back: one word changed, one sentence cut.
async function editorsFile(folder: string) {
  const paragraph = (text: string, marks: { start?: boolean; end?: boolean } = {}) =>
    new Paragraph({
      children: [
        ...(marks.start ? [new Bookmark({ id: `penna_${KOKET}`, children: [] })] : []),
        new TextRun(text),
        ...(marks.end ? [new Bookmark({ id: `pennaend_${KOKET}`, children: [] })] : []),
      ],
    });
  const doc = new Document({
    sections: [
      {
        children: [
          paragraph(
            "Brevet låg på köksbordet när Elin kom in från kylan. Kuvertet var gult av ålder, och handstilen kände hon igen innan hon ens hunnit ta av sig vantarna.",
            { start: true },
          ),
          paragraph("– Det kom i morse, sa Arvid utan att se upp från spisen.", { end: true }),
        ],
      },
    ],
  });
  mkdirSync(folder, { recursive: true });
  const path = join(folder, "redigerad.docx");
  writeFileSync(path, await Packer.toBuffer(doc));
  return path;
}

test("an editor's Word file is read back, and their changes are accepted or rejected one by one", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await openExample(page);
  const file = await editorsFile(testInfo.outputDir);

  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Meny" }).first().click();
  await page.getByRole("menuitem", { name: "Läs in redaktörens Word-fil…" }).click();
  await (await chooser).setFiles(file);
  await expect(page.getByText("Redaktören har ändrat i 1 scener")).toBeVisible();
  await page.getByRole("button", { name: "Stäng", exact: true }).click();

  const panel = page.getByRole("complementary", { name: "Granskning" });
  await expect(panel.getByText("Redaktörens ändringar")).toBeVisible();
  await expect(editor(page).locator(".revision-removed").first()).toBeVisible();
  await panel.getByRole("button", { name: "Godta", exact: true }).click();

  await expect(panel.getByText("Alla ändringar är genomgångna.")).toBeVisible();
  await expect(editor(page)).not.toContainText("Med posten");
});
