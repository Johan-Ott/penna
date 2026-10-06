// Typst sets the book here, away from the window, so writing never waits for a long book.
import compilerWasmUrl from "@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm?url";
import rendererWasmUrl from "@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm?url";
import { createTypst, type TypstFiles } from "../export/typstCompile.js";
import { TypstError } from "../export/typstError.js";

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
  "crimson-pro-400-normal",
  "crimson-pro-400-italic",
  "crimson-pro-700-normal",
  "crimson-pro-700-italic",
  "libre-baskerville-400-normal",
  "libre-baskerville-400-italic",
  "libre-baskerville-700-normal",
  "source-serif-4-400-normal",
  "source-serif-4-400-italic",
  "source-serif-4-700-normal",
  "source-serif-4-700-italic",
  "geist-sans-400-normal",
];

async function bytesAt(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} kunde inte läsas.`);
  return new Uint8Array(await response.arrayBuffer());
}

const typst = createTypst({
  compilerWasm: () => bytesAt(compilerWasmUrl),
  rendererWasm: () => bytesAt(rendererWasmUrl),
  fonts: () => Promise.all(FONT_FILES.map((name) => bytesAt(`/fonts/${name}.ttf`))),
});

export interface TypstRequest {
  id: number;
  method: "pdf" | "svg" | "pageMarks";
  source: string;
  files: TypstFiles;
}

// One book at a time: the compiler holds one source, so requests wait their turn.
let queue: Promise<unknown> = Promise.resolve();

self.onmessage = (event: MessageEvent<TypstRequest>) => {
  const { id, method, source, files } = event.data;
  queue = queue.then(async () => {
    try {
      postMessage({ id, result: await typst[method](source, files) });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      postMessage({ id, error: message, isTypst: error instanceof TypstError });
    }
  });
};
