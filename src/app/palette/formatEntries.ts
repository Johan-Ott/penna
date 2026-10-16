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
import { shortcutText } from "../shortcuts.js";
import { t } from "../../i18n/i18n.js";

/** Formatting the text: bold, italic, a scene break, a footnote, a picture and the styles. */
export function formatEntries(context: PaletteContext): PaletteEntry[] {
  const { run } = context;
  const styles = (Object.keys(STYLE_LABELS) as StyleChoice[]).map((style) =>
    command(t("Stil: {style}", { style: STYLE_LABELS[style] }), () => run(setStyle(style))),
  );
  return [
    command(t("Fetstil"), () => run(toggleBold), shortcutText({ key: "b" })),
    command(t("Kursiv"), () => run(toggleItalic), shortcutText({ key: "i" })),
    command(t("Rensa formatering"), () => run(clearFormatting)),
    command(t("Scenbrytning"), () => run(insertSceneBreak), shortcutText({ key: "enter" })),
    command(t("Infoga fotnot"), () => run(insertFootnote), shortcutText({ key: "f", alt: true })),
    ...(context.insertPicture ? [command(t("Infoga bild…"), context.insertPicture)] : []),
    ...styles,
  ];
}
