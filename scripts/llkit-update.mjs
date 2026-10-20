// `npm run llkit:uppdatera <mapp>`: gives an app beside Skrivro this llkit, in place of its copy.
// The app's own files are never touched; its git shows what changed in llkit.
import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const skrivro = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const folder = process.argv[2];
const kit = folder && resolve(folder, "llkit");
if (!kit || !existsSync(kit)) {
  process.stderr.write("Ange appens mapp med llkit i: npm run llkit:uppdatera ../min-app\n");
  process.exit(1);
}
rmSync(kit, { recursive: true });
cpSync(join(skrivro, "llkit"), kit, {
  recursive: true,
  filter: (path) => !path.startsWith(join(skrivro, "llkit/template")),
});
process.stdout.write(`llkit i ${kit} är nu Skrivros. Se ändringarna med git diff där.\n`);
