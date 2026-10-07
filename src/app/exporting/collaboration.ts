import type { MenuItem } from "../Menu.js";
import type { Project } from "../useProject.js";
import { startChoices, type ExportChoices } from "./useExport.js";
import { t } from "../../i18n/i18n.js";

// Sharing is by files: the editor gets the Word manuscript and sends it back with changes,
// which Läs in redaktörens Word-fil takes; a test reader gets the book as an e-book.
export function collaborationItems(
  project: Project,
  run: (choices: ExportChoices) => void,
): MenuItem[] {
  return [
    {
      label: t("Skicka till redaktör…"),
      onSelect: () => run({ ...startChoices(project), format: "manus" }),
    },
    {
      label: t("Läsarexemplar…"),
      onSelect: () => run({ ...startChoices(project), format: "ebok" }),
    },
  ];
}
