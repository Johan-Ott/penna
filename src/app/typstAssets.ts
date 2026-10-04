import compilerWasmUrl from "@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm?url";
import rendererWasmUrl from "@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm?url";
import { createTypst } from "../export/typstCompile.js";

// The book fonts ship with Penna in public/fonts, each with its OFL licence beside it.
const FONT_FILES = [
  "literata-400-normal",
  "literata-400-italic",
  "literata-700-normal",
  "literata-700-italic",
  "eb-garamond-400-normal",
  "eb-garamond-400-italic",
  "eb-garamond-700-normal",
  "eb-garamond-700-italic",
  "geist-sans-400-normal",
];

async function bytesAt(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} kunde inte läsas.`);
  return new Uint8Array(await response.arrayBuffer());
}

/** The app's Typst: started the first time a book is set, which takes a moment. */
export const appTypst = createTypst({
  compilerWasm: () => bytesAt(compilerWasmUrl),
  rendererWasm: () => bytesAt(rendererWasmUrl),
  fonts: () => Promise.all(FONT_FILES.map((name) => bytesAt(`/fonts/${name}.ttf`))),
});
