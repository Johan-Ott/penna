// Sets Skrivro's version everywhere it is written: `npm run version -- 1.0.3`.
import { readFileSync, writeFileSync } from "node:fs";

const version = process.argv[2] ?? "";
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  process.stderr.write("Ange en version som 1.0.3: npm run version -- 1.0.3\n");
  process.exit(1);
}

function replaceIn(path, pattern, replacement) {
  const text = readFileSync(path, "utf8");
  if (!pattern.test(text)) throw new Error(`Hittade ingen version i ${path}`);
  writeFileSync(path, text.replace(pattern, replacement));
}

replaceIn("package.json", /"version": "[^"]*"/, `"version": "${version}"`);
replaceIn("src-tauri/tauri.conf.json", /"version": "[^"]*"/, `"version": "${version}"`);
// Only the first `version =` in Cargo.toml is Skrivro's own; the rest belong to dependencies.
replaceIn("src-tauri/Cargo.toml", /^version = "[^"]*"/m, `version = "${version}"`);
// The lock file names Skrivro's own version too; left alone, the next build changes it.
replaceIn("src-tauri/Cargo.lock", /(name = "skrivro"\nversion = )"[^"]*"/, `$1"${version}"`);

process.stdout.write(
  `Skrivro ${version}. Släpp den med:\n` +
    `  git commit -am "Skrivro ${version}" && git tag v${version} && git push --follow-tags\n`,
);
