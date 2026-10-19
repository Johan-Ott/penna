// `npm run ny-app <namn>`: a new app beside Skrivro, in its own folder and repository, built on a
// copy of llkit. The name is the app's name; its folder, crate and identifier are made from it.
import { execSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const penna = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const name = process.argv.slice(2).join(" ").trim();
const slug = name
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");
if (!slug || !/^[a-z]/.test(slug)) {
  process.stderr.write("Ge appen ett namn som börjar med en bokstav: npm run ny-app Mitt namn\n");
  process.exit(1);
}
const target = resolve(penna, "..", slug);
if (existsSync(target)) {
  process.stderr.write(`${target} finns redan.\n`);
  process.exit(1);
}

const words = {
  __APP_NAME__: name,
  __APP_SLUG__: slug,
  __APP_CRATE__: slug.replaceAll("-", "_"),
  __APP_ID__: `se.llstudios.${slug.replaceAll("-", "")}`,
  // One signing key for all the apps: its public half is read from Skrivro.
  __APP_PUBKEY__: JSON.parse(readFileSync(join(penna, "src-tauri/tauri.conf.json"), "utf8")).plugins
    .updater.pubkey,
};
const fillIn = (text) => text.replace(/__APP_[A-Z]+__/g, (word) => words[word] ?? word);

function fillAll(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) fillAll(path);
    else writeFileSync(path, fillIn(readFileSync(path, "utf8")));
  }
}

cpSync(join(penna, "llkit/template"), target, { recursive: true });
fillAll(target);
renameSync(join(target, "gitignore"), join(target, ".gitignore"));
cpSync(join(penna, "llkit"), join(target, "llkit"), {
  recursive: true,
  filter: (path) => !path.startsWith(join(penna, "llkit/template")),
});
cpSync(join(penna, "src-tauri/icons"), join(target, "src-tauri/icons"), {
  recursive: true,
  filter: (path) => !path.includes("android"),
});
execSync("git init -b main", { cwd: target, stdio: "ignore" });

process.stdout.write(`${name} finns nu i ${target}

  cd ../${slug}
  npm install
  npm run app        (appen i ett eget fönster)
  npm run dev:web    (i webbläsaren)

Ikonerna är Skrivros tills appen får egna. llkit uppdateras med
  npm run llkit:uppdatera ../${slug}     (körs här i Skrivro)
`);
