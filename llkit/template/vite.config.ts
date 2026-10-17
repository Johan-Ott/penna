import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// The version shown in the app is the one Tauri builds it with.
const tauriConfig = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8")) as {
  version: string;
};

// Tauri expects the dev server on a fixed port and prints its own output.
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@llkit": fileURLToPath(new URL("./llkit", import.meta.url)) } },
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  define: { __APP_VERSION__: JSON.stringify(tauriConfig.version) },
});
