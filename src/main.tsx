import "./i18n/startLanguage.js";
import "@fontsource/geist-sans/400.css";
import "@fontsource/geist-sans/500.css";
import "@fontsource/geist-sans/600.css";
import "@fontsource/geist-mono/400.css";
import "@fontsource/literata/400.css";
import "@fontsource/literata/400-italic.css";
import "@fontsource/literata/600.css";
import "./styles/tokens.css";
import "./styles/app.css";
import "./styles/shell.css";
import "./styles/phone.css";
import "./styles/motion.css";
import "./editor/editor.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App.js";
import { recordUncaughtErrors } from "./app/errorLog.js";
import { keepWebMenuOut } from "./app/spelling/keepWebMenuOut.js";
import { styledTooltips } from "./app/tooltips.js";

recordUncaughtErrors();
keepWebMenuOut();
styledTooltips();
// Android has a back button, so the page can leave out its own ways to close.
document.documentElement.classList.toggle("android", /Android/i.test(navigator.userAgent));
const root = document.getElementById("root");
if (!root) throw new Error("index.html has no #root element for Penna to render into.");
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
