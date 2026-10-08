import type { CSSProperties } from "react";
import { bookTheme, isDarkTheme, themeTokens, type Theme } from "../../project/themes.js";

/** The book's theme as style on the app's outermost element; nothing when it follows the app. */
export function themeStyle(fields: Record<string, unknown>): CSSProperties | undefined {
  const theme = bookTheme(fields);
  if (!theme) return undefined;
  return {
    ...themeTokens(theme),
    colorScheme: isDarkTheme(theme) ? "dark" : "light",
  } as CSSProperties;
}

/** A ready theme is kept by its name, an own one by its colours. */
export function themeField(theme: Theme | null) {
  if (!theme) return undefined;
  return theme.id === "eget" ? theme : { id: theme.id };
}
