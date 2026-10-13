// `node --import ./scripts/ts-loader.mjs scripts/new-book.ts <bibliotek> <titel> [disposition.md]
// [--struktur id] [--bitar a,b] [--röst "jag dåtid djup"] [--totalmål n] [--serie namn]`.
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createBookFromOutline } from "../src/project/bookFromOutline.js";
import { bookFileCalls } from "../src/project/bookFiles.js";
import { nodeFileSystem } from "../src/storage/nodeFileSystem.js";

// The flags that are book settings, set after the book is made as `book` sets them.
const SETTINGS = ["röst", "totalmål", "dagsmål", "deadline"];

function parse(argv: string[]) {
  const positional: string[] = [];
  const flags: Record<string, string> = {};
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index] ?? "";
    if (arg.startsWith("--")) flags[arg.slice(2)] = argv[++index] ?? "";
    else positional.push(arg);
  }
  return { positional, flags };
}

const { positional, flags } = parse(process.argv.slice(2));
const [libraryDir, title, outlinePath] = positional;
if (!libraryDir || !title)
  throw new Error("Usage: new-book.ts <bibliotek> <titel> [disposition.md] [--flaggor]");

const outline = outlinePath ? await readFile(resolve(outlinePath), "utf8") : undefined;
const choices = {
  title,
  ...(flags["struktur"] ? { structure: flags["struktur"] } : {}),
  ...(flags["bitar"] ? { pieces: flags["bitar"].split(",").map((piece) => piece.trim()) } : {}),
};
const library = resolve(libraryDir).replaceAll("\\", "/");
const created = await createBookFromOutline(nodeFileSystem, library, choices, outline);
const calls = bookFileCalls({ fileSystem: nodeFileSystem, dir: created.dir });
for (const field of SETTINGS) {
  const value = flags[field];
  if (value !== undefined) await calls.book(field, value);
}
const series = flags["serie"] ? await calls.series(flags["serie"]) : null;
process.stdout.write(`${JSON.stringify({ ...created, series }, null, 2)}\n`);
