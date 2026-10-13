// Lets Node run Penna's own TypeScript for the book CLI: "./tree.js" in the source is tree.ts on
// disk, and a JSON file loads as a module. Node strips the types itself.
import { existsSync, readFileSync } from "node:fs";
import { register } from "node:module";
import { fileURLToPath, URL } from "node:url";

export async function resolve(specifier, context, next) {
  const isOwn = specifier.startsWith(".") && specifier.endsWith(".js") && context.parentURL;
  if (isOwn && !existsSync(fileURLToPath(new URL(specifier, context.parentURL)))) {
    const typed = new URL(specifier.replace(/\.js$/, ".ts"), context.parentURL);
    const tsx = new URL(specifier.replace(/\.js$/, ".tsx"), context.parentURL);
    if (existsSync(fileURLToPath(typed))) return next(typed.href, context);
    if (existsSync(fileURLToPath(tsx))) return next(tsx.href, context);
  }
  return next(specifier, context);
}

export async function load(url, context, next) {
  if (url.endsWith(".json")) {
    const source = `export default ${readFileSync(fileURLToPath(url), "utf8")};`;
    return { format: "module", source, shortCircuit: true };
  }
  return next(url, context);
}

if (!import.meta.url.includes("?hooks")) register(`${import.meta.url}?hooks`);
