import { expect, test } from "@playwright/test";
import { cursorAfterFirstParagraph, editor, openExample, runCommand } from "./helpers";

test("a picture is put into the text, gets a caption and a size, and the text still reads", async ({
  page,
}) => {
  await openExample(page);
  await cursorAfterFirstParagraph(page);

  const chooser = page.waitForEvent("filechooser");
  await runCommand(page, "Infoga bild…");
  await (await chooser).setFiles("src-tauri/icons/128x128.png");

  const picture = editor(page).locator("figure.picture");
  await expect(picture.locator("img")).toHaveAttribute("src", /^blob:/);
  await picture.getByPlaceholder("Bildtext").fill("Ön, ritad av Arvid");
  await picture.getByPlaceholder("Bildtext").press("Tab");
  await picture.hover();
  await picture.getByRole("button", { name: "Smal" }).click();

  await expect(picture).toHaveAttribute("data-size", "smal");
  await expect(picture.getByPlaceholder("Bildtext")).toHaveValue("Ön, ritad av Arvid");
  await expect(editor(page)).toContainText("Det kom i morse");
});
