// `npm run build:windows`: the Windows installer in out/, to run on this or another computer.
// It has no update files, so it needs no signing key; releases with updates go through GitHub.
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";

const say = (text) => process.stdout.write(`\n${text}\n`);
const { version } = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8"));
const name = `Penna_${version}_x64-setup.exe`;

say("== Penna byggs för Windows");
execFileSync("npx", ["tauri build --config src-tauri/tauri.installer.conf.json"], {
  stdio: "inherit",
  shell: true,
});
mkdirSync("out", { recursive: true });
copyFileSync(`src-tauri/target/release/bundle/nsis/${name}`, `out/${name}`);
say(`Klart: out/${name}`);
