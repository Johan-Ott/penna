import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { defineConfig } from "vite";

// The version shown under "Om Penna" is the one Tauri builds the app with.
const tauriConfig = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8")) as {
  version: string;
};

// Tauri expects the dev server on a fixed port and prints its own output.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  // Typst runs in a worker that loads its parts as modules.
  worker: { format: "es" },
  define: { __APP_VERSION__: JSON.stringify(tauriConfig.version) },
});
