// `npm run build:android`: out/Penna.apk, signed with Penna's own key in ~/.penna (never in git),
// or else with Android's test key, which must never reach a release: phones cannot change keys.
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
import { androidSdk } from "./platformFolders.mjs";

const say = (text) => process.stdout.write(`\n${text}\n`);
const newest = (dir) => readdirSync(dir).sort().at(-1);

const sdk = process.env.ANDROID_HOME ?? androidSdk(process.platform, process.env, homedir());
const ndk = process.env.NDK_HOME ?? join(sdk, "ndk", newest(join(sdk, "ndk")));
const buildTools = join(sdk, "build-tools", newest(join(sdk, "build-tools")));
// apksigner is a .bat on Windows and a shell script on macOS.
const signer = join(buildTools, process.platform === "win32" ? "apksigner.bat" : "apksigner");
const environment = { ...process.env, ANDROID_HOME: sdk, NDK_HOME: ndk };
const testKey = join(homedir(), ".android", "debug.keystore");
const releaseKey = join(homedir(), ".penna", "penna-release.jks");
const releasePass = join(homedir(), ".penna", "penna-release.pass");
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
  // Replacing needs room for both versions; a full test phone loses its test books instead.
  try {
    step("Installeras i emulatorn", adb, [`install -r -d ${join(debug, apk)}`]);
  } catch {
    step("Fullt i emulatorn: Penna avinstalleras först", adb, ["uninstall se.penna.app"]);
    step("Installeras i emulatorn", adb, [`install ${join(debug, apk)}`]);
  }
  step("Startas", adb, ["shell monkey -p se.penna.app 1"]);
  say("Klart: node scripts/drive-app.mjs --android steg.mjs");
  process.exit(0);
}

// `npm run build:android -- --play`: out/Penna.aab for Google Play, signed with the same key as
// the APK, so a phone can move between Play and the website's file.
if (process.argv.includes("--play")) {
  if (!existsSync(releaseKey) || !existsSync(releasePass)) {
    process.stderr.write("Pennas nyckel saknas i ~/.penna: Play får aldrig testnyckeln.\n");
    process.exit(1);
  }
  step("Penna byggs för Google Play (arm64)", "npx", [
    "tauri android build --aab --target aarch64",
  ]);
  const bundle = "src-tauri/gen/android/app/build/outputs/bundle/universalRelease";
  const aab = join(bundle, readdirSync(bundle).find((name) => name.endsWith(".aab")) ?? "");
  mkdirSync("out", { recursive: true });
  copyFileSync(aab, join("out", "Penna.aab"));
  // Quoted, as Java usually lies under Program Files.
  const jarsigner = `"${join(process.env.JAVA_HOME ?? "", "bin", "jarsigner")}"`;
  step("Filen signeras", jarsigner, [
    `-keystore ${releaseKey} -storepass:file ${releasePass} ${join("out", "Penna.aab")} penna`,
  ]);
  say("Klart: out/Penna.aab");
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
const hasReleaseKey = existsSync(releaseKey) && existsSync(releasePass);
const key = hasReleaseKey
  ? `--ks ${releaseKey} --ks-pass file:${releasePass}`
  : `--ks ${testKey} --ks-pass pass:android`;
step("Filen signeras", signer, [`sign ${key} --out ${join("out", "Penna.apk")} ${aligned}`]);
say(hasReleaseKey ? "Klart: out/Penna.apk" : "Klart, men med testnyckeln: inte för release.");
