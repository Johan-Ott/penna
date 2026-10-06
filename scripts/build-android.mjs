// `npm run build:android`: a signed app file in out/Penna.apk, to send to a phone and open there.
// It is signed with Android's own test key, enough to install it; a store needs a real key.
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const say = (text) => process.stdout.write(`\n${text}\n`);
const newest = (dir) => readdirSync(dir).sort().at(-1);

const sdk = process.env.ANDROID_HOME ?? join(process.env.LOCALAPPDATA ?? "", "Android", "Sdk");
const ndk = process.env.NDK_HOME ?? join(sdk, "ndk", newest(join(sdk, "ndk")));
const buildTools = join(sdk, "build-tools", newest(join(sdk, "build-tools")));
const environment = { ...process.env, ANDROID_HOME: sdk, NDK_HOME: ndk };
const testKey = join(homedir(), ".android", "debug.keystore");
// src-tauri/gen is not in git, so our Kotlin files, icons and the sign-in library are added on
// every build.
const android = "src-tauri/gen/android/app";
const signInLibrary = 'implementation("com.google.android.gms:play-services-auth:21.3.0")';

// Adds `line` after the first `anchor` in a generated file, once.
function addOnce(file, anchor, line) {
  const text = readFileSync(file, "utf8");
  if (!text.includes(line)) writeFileSync(file, text.replace(anchor, `${anchor}\n${line}`));
}

function addOwnSources() {
  for (const file of readdirSync("src-tauri/android")) {
    copyFileSync(
      join("src-tauri/android", file),
      join(android, "src/main/java/se/penna/app", file),
    );
  }
  cpSync("src-tauri/icons/android", join(android, "src/main/res"), { recursive: true });
  addOnce(join(android, "build.gradle.kts"), "dependencies {", `    ${signInLibrary}`);
  // The books live in the app's folder, so uninstalling asks whether to keep them.
  const manifest = join(android, "src/main/AndroidManifest.xml");
  addOnce(manifest, "<application", '        android:hasFragileUserData="true"');
}

function step(title, command, args) {
  say(`== ${title}`);
  execFileSync(command, args, { stdio: "inherit", env: environment, shell: true });
}

if (!existsSync(testKey)) {
  process.stderr.write(
    "Androids testnyckel saknas. Öppna Android Studio en gång, så skapas den.\n",
  );
  process.exit(1);
}
if (!existsSync("src-tauri/gen/android")) {
  step("Android-projektet skapas (bara första gången)", "npx", ["tauri android init --ci"]);
}
addOwnSources();

// `npm run build:android -- --emulator`: a debug build in the running emulator, for
// `node scripts/drive-app.mjs --android`. The emulator is a test phone; no real books are near it.
if (process.argv.includes("--emulator")) {
  const adb = join(sdk, "platform-tools", "adb");
  step("Penna byggs för emulatorn (x86_64, felsökning)", "npx", [
    "tauri android build --debug --apk --target x86_64",
  ]);
  const debug = "src-tauri/gen/android/app/build/outputs/apk/universal/debug";
  const apk = readdirSync(debug).find((name) => name.endsWith(".apk")) ?? "";
  step("Installeras i emulatorn", adb, [`install -r -d ${join(debug, apk)}`]);
  step("Startas", adb, ["shell monkey -p se.penna.app 1"]);
  say("Klart: node scripts/drive-app.mjs --android steg.mjs");
  process.exit(0);
}

step("Penna byggs för moderna telefoner (arm64)", "npx", [
  "tauri android build --apk --target aarch64",
]);

const built = "src-tauri/gen/android/app/build/outputs/apk/universal/release";
const aligned = join(built, "app-aligned.apk");
mkdirSync("out", { recursive: true });
step("Filen packas för Android", join(buildTools, "zipalign"), [
  `-f -p 4 ${join(built, "app-universal-release-unsigned.apk")} ${aligned}`,
]);
// Android's test key is the same on every computer, with the password "android".
step("Filen signeras", join(buildTools, "apksigner.bat"), [
  `sign --ks ${testKey} --ks-pass pass:android --out ${join("out", "Penna.apk")} ${aligned}`,
]);
say("Klart: out/Penna.apk");
