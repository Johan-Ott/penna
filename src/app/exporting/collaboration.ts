import type { MenuItem } from "../Menu.js";
import type { Project } from "../useProject.js";
import { startChoices, type ExportChoices } from "./useExport.js";
import { t } from "../../i18n/i18n.js";

// By files, with no server: an editor or test reader sends the Word manuscript back with changes
// and comments for Läs in kommenterad Word-fil; one who only reads gets the e-book.
export function collaborationItems(
  project: Project,
  run: (choices: ExportChoices) => void,
): MenuItem[] {
  return [
    {
      label: t("Skicka till redaktör eller testläsare…"),
      onSelect: () => run({ ...startChoices(project), format: "manus" }),
    },
    {
      label: t("Läsarexemplar…"),
      onSelect: () => run({ ...startChoices(project), format: "ebok" }),
    },
  ];
}
