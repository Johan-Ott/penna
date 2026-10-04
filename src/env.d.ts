/** Set by vite.config.ts from src-tauri/tauri.conf.json. */
declare const __APP_VERSION__: string;

// Vite gives an imported file's URL when the import ends in ?url.
declare module "*?url" {
  const url: string;
  export default url;
}
