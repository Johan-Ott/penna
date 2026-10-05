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
import "./editor/editor.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App.js";
import { recordUncaughtErrors } from "./app/errorLog.js";

recordUncaughtErrors();
const root = document.getElementById("root");
if (!root) throw new Error("index.html has no #root element for Penna to render into.");
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
