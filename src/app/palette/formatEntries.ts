import {
  clearFormatting,
  insertSceneBreak,
  setStyle,
  STYLE_LABELS,
  toggleBold,
  toggleItalic,
  type StyleChoice,
} from "../../editor/commands.js";
import { insertFootnote } from "../../editor/footnoteEditing.js";
import { command, type PaletteContext } from "./paletteEntries.js";
import type { PaletteEntry } from "./paletteSearch.js";
import { t } from "../../i18n/i18n.js";

/** Formatting the text: bold, italic, a scene break, a footnote, a picture and the styles. */
export function formatEntries(context: PaletteContext): PaletteEntry[] {
  const { run } = context;
  const styles = (Object.keys(STYLE_LABELS) as StyleChoice[]).map((style) =>
    command(t("Stil: {style}", { style: STYLE_LABELS[style] }), () => run(setStyle(style))),
  );
  return [
    command(t("Fetstil"), () => run(toggleBold), "Ctrl+B"),
    command(t("Kursiv"), () => run(toggleItalic), "Ctrl+I"),
    command(t("Rensa formatering"), () => run(clearFormatting)),
    command(t("Scenbrytning"), () => run(insertSceneBreak), "Ctrl+Enter"),
    command(t("Infoga fotnot"), () => run(insertFootnote), "Ctrl+Alt+F"),
    ...(context.insertPicture ? [command(t("Infoga bild…"), context.insertPicture)] : []),
    ...styles,
  ];
}
