import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Tauri expects the dev server on a fixed port and prints its own output.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: { port: 1420, strictPort: true },
});
