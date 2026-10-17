import { useEffect } from "react";
import type { Theme } from "./settings.js";

// llkit's tokens read data-theme on the page's root; "system" follows the computer's setting.
export function useTheme(theme: Theme) {
  useEffect(() => {
    const dark = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const isDark = theme === "mörkt" || (theme === "system" && dark.matches);
      document.documentElement.dataset["theme"] = isDark ? "dark" : "light";
    };
    apply();
    dark.addEventListener("change", apply);
    return () => dark.removeEventListener("change", apply);
  }, [theme]);
}
