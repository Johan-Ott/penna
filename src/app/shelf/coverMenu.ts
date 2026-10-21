import { recordFailure } from "@llkit/errorLog.js";
import type { MenuItem } from "@llkit/Menu.js";
import { changeBookFile } from "../../project/projectFile.js";
import type { ShelfBook } from "../../project/shelf.js";
import { COVER_CHOICES } from "../../project/shelfLook.js";
import { platform } from "../platform.js";
import { t } from "../../i18n/i18n.js";

// The shelf sees the new look when the folder watch notices project.json change.
const chooseLook = (dir: string, look: string | null) =>
  void changeBookFile(platform.fileSystem, dir, { coverLook: look }).catch(
    recordFailure("Omslagets färger"),
  );

/** Omslag in the book's menu: a picture, or colours, the genre's or chosen; a picture covers them. */
export function coverItem(book: ShelfBook, hasPicture: boolean, onChoosePicture: () => void) {
  if (hasPicture) return { label: t("Välj omslag…"), onSelect: onChoosePicture };
  const looks: MenuItem[] = COVER_CHOICES.map(([look, label]) => ({
    label,
    isChecked: book.coverLook === look,
    onSelect: () => chooseLook(book.dir, look),
  }));
  return {
    label: t("Omslag"),
    submenu: [
      { label: t("Bild…"), onSelect: onChoosePicture },
      {
        label: t("Automatiskt"),
        isChecked: !book.coverLook,
        separatorBefore: true,
        onSelect: () => chooseLook(book.dir, null),
      },
      ...looks,
    ],
  };
}
