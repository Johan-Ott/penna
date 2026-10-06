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

import { TypstError } from "./typstError.js";
import { t } from "../i18n/i18n.js";

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

export type TypstFiles = Map<string, Uint8Array>;

// The source and the pictures it uses; what an earlier book left behind is cleared first.
function load(compiler: TypstCompiler, source: string, files: TypstFiles) {
  compiler.resetShadow();
  files.forEach((bytes, path) => compiler.mapShadow(path, bytes));
  compiler.addSource(MAIN, source);
}

async function compile(compiler: TypstCompiler, source: string, files: TypstFiles, format: number) {
  load(compiler, source, files);
  const output = await compiler.compile({ mainFilePath: MAIN, format, diagnostics: "full" });
  const errors = (output.diagnostics ?? []).filter((found) => found.severity === "error");
  if (!output.result || errors.length > 0) {
    throw new TypstError(errors[0]?.message ?? t("Typst kunde inte sätta boken."));
  }
  return output.result;
}

/** Where each marked block lands, and how many sheets the book has. */
export interface PageMarks {
  marks: { scene: string; block: number; page: number }[];
  /** Every page, blank ones included, as a printer counts them. */
  pages: number;
  /** The number printed on the last page. */
  lastPage: number;
}

async function queryPages(compiler: TypstCompiler, source: string, files: TypstFiles) {
  load(compiler, source, files);
  return compiler.runWithWorld({ mainFilePath: MAIN }, async (world) => {
    await world.compile();
    const marks = (await world.query({ selector: "<pm>", field: "value" })) as PageMarks["marks"];
    const sheets = (await world.query({ selector: "<sheet>", field: "value" })) as number[];
    const found: PageMarks = { marks, pages: sheets.length, lastPage: sheets.at(-1) ?? 0 };
    return found;
  });
}

/** Started on first use, then kept, since starting takes a moment. */
export function createTypst(assets: TypstAssets) {
  let compiler: Promise<TypstCompiler> | null = null;
  let renderer: Promise<TypstRenderer> | null = null;
  const compilerOnce = () => (compiler ??= startCompiler(assets));
  const rendererOnce = () => (renderer ??= startRenderer(assets));
  return {
    pdf: async (source: string, files: TypstFiles = new Map()) =>
      compile(await compilerOnce(), source, files, PDF),
    pageMarks: async (source: string, files: TypstFiles = new Map()) =>
      queryPages(await compilerOnce(), source, files),
    /** Drawn from the same compilation as the PDF. */
    svg: async (source: string, files: TypstFiles = new Map()) => {
      const vector = await compile(await compilerOnce(), source, files, VECTOR);
      const drawer = await rendererOnce();
      return drawer.runWithSession({ format: "vector", artifactContent: vector }, (session) =>
        drawer.renderSvg({ renderSession: session }),
      );
    },
  };
}
