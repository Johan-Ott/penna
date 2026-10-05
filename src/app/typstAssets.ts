import compilerWasmUrl from "@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm?url";
import rendererWasmUrl from "@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm?url";
import type { createTypst } from "../export/typstCompile.js";

// Each font in public/fonts has its OFL licence beside it.
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

// Typst and its 28 MB compiler load the first time a book is set, not when Penna starts.
let started: ReturnType<typeof createTypst> | null = null;

async function typst() {
  const typstCompile = await import("../export/typstCompile.js");
  started ??= typstCompile.createTypst({
    compilerWasm: () => bytesAt(compilerWasmUrl),
    rendererWasm: () => bytesAt(rendererWasmUrl),
    fonts: () => Promise.all(FONT_FILES.map((name) => bytesAt(`/fonts/${name}.ttf`))),
  });
  return started;
}

export const appTypst = {
  pdf: async (source: string) => (await typst()).pdf(source),
  svg: async (source: string) => (await typst()).svg(source),
};
