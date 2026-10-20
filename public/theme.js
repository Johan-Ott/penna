// Before anything is drawn: the theme the writer chose, so a reload never flashes the wrong colour.
// useWritingSettings sets the same later; this copy reads skrivro.writing straight from storage.
(function () {
  var theme = "system";
  try {
    var stored = JSON.parse(globalThis.localStorage.getItem("skrivro.writing") || "{}");
    theme = stored.theme || (stored.darkTheme === true ? "mörkt" : "system");
  } catch {
    theme = "system";
  }
  var isSystemDark = globalThis.matchMedia("(prefers-color-scheme: dark)").matches;
  var isDark = theme === "mörkt" || (theme === "system" && isSystemDark);
  globalThis.document.documentElement.dataset.theme = isDark ? "dark" : "light";
})();

// The window waits hidden until the first frame, so WebView2's white never shows before it; the
// app shows it itself after a few seconds should this never run.
globalThis.requestAnimationFrame(function () {
  var tauri = globalThis.__TAURI_INTERNALS__;
  if (tauri) tauri.invoke("plugin:window|show", { label: "main" }).catch(function () {});
});
