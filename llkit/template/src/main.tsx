import "./i18n.js";
import "./platform.js";
import "@fontsource/geist-sans/400.css";
import "@fontsource/geist-sans/600.css";
import "@fontsource/literata/600.css";
import "@llkit/tokens.css";
import "@llkit/kit.css";
import "./app.css";
import "@llkit/motion.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";

const root = document.getElementById("root");
if (root)
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
