// `node --import ./scripts/ts-loader.mjs scripts/book.ts <bokmapp> <anrop> [argument…]`: one
// call on a book's files, Penna running or not; penna.mjs --book uses it. The answer is JSON.
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { bookFileCalls } from "../src/project/bookFiles.js";
import { nodeFileSystem } from "../src/storage/nodeFileSystem.js";

const [dir, call, ...args] = process.argv.slice(2);
if (!dir || !call) throw new Error("Usage: book.ts <bokmapp> <anrop> [argument…]");

const calls = bookFileCalls({
  fileSystem: nodeFileSystem,
  dir: resolve(dir).replaceAll("\\", "/"),
});
const run = (calls as Record<string, ((...values: string[]) => Promise<unknown>) | undefined>)[
  call
];
if (!run) throw new Error(`Inget anrop heter ${call}. Anropen: ${Object.keys(calls).join(", ")}.`);

// write takes its text from a file, as a scene is too long to give on the command line.
const values =
  call === "write" && args[1] ? [args[0] ?? "", await readFile(resolve(args[1]), "utf8")] : args;
const answer = await run(...values);
process.stdout.write(`${JSON.stringify(answer ?? null, null, 2)}\n`);
