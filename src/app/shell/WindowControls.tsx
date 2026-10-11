import { platform } from "../platform.js";
import { t } from "../../i18n/i18n.js";

// Thin strokes, as the window's own buttons draw them.
const Glyph = ({ path }: { path: string }) => (
  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
    <path d={path} stroke="currentColor" strokeWidth="1" fill="none" />
  </svg>
);

/** Minimise, maximise and close, at the far end of the top bar; nothing in a browser or phone. */
export function WindowControls() {
  const controls = platform.windowControls;
  if (!controls) return null;
  return (
    <span className="window-controls">
      <button className="window-control" aria-label={t("Minimera")} onClick={controls.minimize}>
        <Glyph path="M0 5.5h10" />
      </button>
      <button
        className="window-control"
        aria-label={t("Maximera")}
        onClick={controls.toggleMaximize}
      >
        <Glyph path="M.5.5h9v9h-9z" />
      </button>
      <button
        className="window-control close"
        aria-label={t("Stäng fönstret")}
        onClick={controls.close}
      >
        <Glyph path="M0 0l10 10M10 0L0 10" />
      </button>
    </span>
  );
}
