// Before anything is drawn: the theme the writer chose, so a reload never flashes the wrong colour.
// useWritingSettings sets the same later; this copy reads penna.writing straight from storage.
(function () {
  var theme = "system";
  try {
    var stored = JSON.parse(globalThis.localStorage.getItem("penna.writing") || "{}");
    theme = stored.theme || (stored.darkTheme === true ? "mörkt" : "system");
  } catch {
    theme = "system";
  }
  var isSystemDark = globalThis.matchMedia("(prefers-color-scheme: dark)").matches;
  var isDark = theme === "mörkt" || (theme === "system" && isSystemDark);
  globalThis.document.documentElement.dataset.theme = isDark ? "dark" : "light";
})();
