import {
  createTypstCompiler,
  createTypstRenderer,
  initOptions,
  loadFonts,
  type TypstCompiler,
  type TypstRenderer,
} from "@myriaddreamin/typst.ts";

/** Fetched in the app, read from disk in tests. */
export interface TypstAssets {
  compilerWasm: () => Promise<Uint8Array>;
  rendererWasm: () => Promise<Uint8Array>;
  fonts: () => Promise<Uint8Array[]>;
}

/** The message is Typst's own. */
export class TypstError extends Error {}

const MAIN = "/main.typ";
const PDF = 1;
const VECTOR = 0;

async function startCompiler(assets: TypstAssets) {
  const compiler = createTypstCompiler();
  const fonts = await assets.fonts();
  await compiler.init({
    getModule: assets.compilerWasm,
    // Only the fonts that ship with Penna, so a book never depends on the internet.
    beforeBuild: [initOptions.disableDefaultFontAssets(), loadFonts(fonts)],
  });
  return compiler;
}

async function startRenderer(assets: TypstAssets) {
  const renderer = createTypstRenderer();
  await renderer.init({ getModule: assets.rendererWasm });
  return renderer;
}

async function compile(compiler: TypstCompiler, source: string, format: number) {
  compiler.addSource(MAIN, source);
  const output = await compiler.compile({ mainFilePath: MAIN, format, diagnostics: "full" });
  const errors = (output.diagnostics ?? []).filter((found) => found.severity === "error");
  if (!output.result || errors.length > 0) {
    throw new TypstError(errors[0]?.message ?? "Typst kunde inte sätta boken.");
  }
  return output.result;
}

/** Started on first use, then kept, since starting takes a moment. */
export function createTypst(assets: TypstAssets) {
  let compiler: Promise<TypstCompiler> | null = null;
  let renderer: Promise<TypstRenderer> | null = null;
  const compilerOnce = () => (compiler ??= startCompiler(assets));
  const rendererOnce = () => (renderer ??= startRenderer(assets));
  return {
    pdf: async (source: string) => compile(await compilerOnce(), source, PDF),
    /** Drawn from the same compilation as the PDF. */
    svg: async (source: string) => {
      const vector = await compile(await compilerOnce(), source, VECTOR);
      const drawer = await rendererOnce();
      return drawer.runWithSession({ format: "vector", artifactContent: vector }, (session) =>
        drawer.renderSvg({ renderSession: session }),
      );
    },
  };
}
