import "./i18n/startLanguage.js";
import "@fontsource/geist-sans/400.css";
import "@fontsource/geist-sans/500.css";
import "@fontsource/geist-sans/600.css";
import "@fontsource/geist-mono/400.css";
import "@fontsource/literata/400.css";
import "@fontsource/literata/400-italic.css";
import "@fontsource/literata/600.css";
import "@llkit/tokens.css";
import "@llkit/kit.css";
import "./styles/app.css";
import "./styles/shell.css";
import "./styles/phone.css";
import "@llkit/motion.css";
import "./editor/editor.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App.js";
import { recordUncaughtErrors } from "@llkit/errorLog.js";
import { keepWebMenuOut } from "./app/spelling/keepWebMenuOut.js";
import { styledTooltips } from "@llkit/tooltips.js";
import { followVisibleHeight, longPressOpensMenus } from "@llkit/touch.js";
import { isMac } from "@llkit/thisComputer.js";
import { platform } from "./app/platform.js";

recordUncaughtErrors();
keepWebMenuOut();
styledTooltips();
longPressOpensMenus();
followVisibleHeight();
// Android has a back button, so the page can leave out its own ways to close.
document.documentElement.classList.toggle("android", /Android/i.test(navigator.userAgent));
// A Mac's app window keeps its own buttons over the top left, so the top bar leaves room for
// them. The browser version has no such window and needs none.
document.documentElement.classList.toggle("mac-window", isMac && !!platform.windowControls);
const root = document.getElementById("root");
if (!root) throw new Error("index.html has no #root element for Penna to render into.");
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
