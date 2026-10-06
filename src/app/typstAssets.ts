import type { PageMarks, TypstFiles } from "../export/typstCompile.js";
import { TypstError } from "../export/typstError.js";
import type { TypstRequest } from "./typstWorker.js";

type Answer = { id: number; result?: unknown; error?: string; isTypst?: boolean };
type Waiting = { resolve: (result: unknown) => void; reject: (error: Error) => void };

// Typst and its 28 MB compiler load the first time a book is set, not when Penna starts.
let worker: Worker | null = null;
let nextId = 0;
const waiting = new Map<number, Waiting>();

function started() {
  if (worker) return worker;
  worker = new Worker(new URL("./typstWorker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (event: MessageEvent<Answer>) => {
    const { id, result, error, isTypst } = event.data;
    const asked = waiting.get(id);
    waiting.delete(id);
    if (error === undefined) asked?.resolve(result);
    else asked?.reject(isTypst ? new TypstError(error) : new Error(error));
  };
  return worker;
}

function ask<T>(method: TypstRequest["method"], source: string, files: TypstFiles = new Map()) {
  const id = ++nextId;
  return new Promise<T>((resolve, reject) => {
    waiting.set(id, { resolve: (result) => resolve(result as T), reject });
    started().postMessage({ id, method, source, files } satisfies TypstRequest);
  });
}

export const appTypst = {
  pdf: (source: string, files?: TypstFiles) => ask<Uint8Array>("pdf", source, files),
  svg: (source: string, files?: TypstFiles) => ask<string>("svg", source, files),
  pageMarks: (source: string, files?: TypstFiles) => ask<PageMarks>("pageMarks", source, files),
};
