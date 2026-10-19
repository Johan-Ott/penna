// `npm run build:store`: out/Skrivro.msix, signed and updated by the Store, so no certificate.
// The names in src-tauri/store.json come from Partner Center > Product identity.
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const say = (text) => process.stdout.write(`\n${text}\n`);
const store = JSON.parse(readFileSync("src-tauri/store.json", "utf8"));
if (Object.values(store).some((value) => !value)) {
  say("Fyll i src-tauri/store.json med värdena från Partner Center > Product identity.");
  process.exit(1);
}
const { version } = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8"));

say("== Skrivro byggs för Microsoft Store");
execFileSync("npx", ["tauri build --no-bundle"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, PENNA_STORE: "1" },
});

const dir = mkdtempSync(join(tmpdir(), "penna-store-"));
mkdirSync(join(dir, "Assets"));
copyFileSync("src-tauri/target/release/penna.exe", join(dir, "penna.exe"));
const icons = join(dir, "icons");
execFileSync("npx", ["tauri", "icon", "src-tauri/icons/icon-source.png", "-o", icons], {
  stdio: "ignore",
  shell: true,
});
for (const name of ["Square44x44Logo.png", "Square150x150Logo.png", "StoreLogo.png"])
  copyFileSync(join(icons, name), join(dir, "Assets", name));
rmSync(icons, { recursive: true });

writeFileSync(
  join(dir, "AppxManifest.xml"),
  `<?xml version="1.0" encoding="utf-8"?>
<Package xmlns="http://schemas.microsoft.com/appx/manifest/foundation/windows10"
  xmlns:uap="http://schemas.microsoft.com/appx/manifest/uap/windows10"
  xmlns:rescap="http://schemas.microsoft.com/appx/manifest/foundation/windows10/restrictedcapabilities"
  IgnorableNamespaces="uap rescap">
  <Identity Name="${store.identityName}" Publisher="${store.publisher}" Version="${version}.0" ProcessorArchitecture="x64" />
  <Properties>
    <DisplayName>${store.displayName}</DisplayName>
    <PublisherDisplayName>${store.publisherDisplayName}</PublisherDisplayName>
    <Logo>Assets\\StoreLogo.png</Logo>
  </Properties>
  <Dependencies>
    <TargetDeviceFamily Name="Windows.Desktop" MinVersion="10.0.17763.0" MaxVersionTested="10.0.26100.0" />
  </Dependencies>
  <Resources>
    <Resource Language="sv-SE" />
    <Resource Language="en-US" />
  </Resources>
  <Applications>
    <Application Id="Skrivro" Executable="penna.exe" EntryPoint="Windows.FullTrustApplication">
      <uap:VisualElements DisplayName="${store.displayName}" Description="${store.displayName}"
        BackgroundColor="transparent" Square150x150Logo="Assets\\Square150x150Logo.png"
        Square44x44Logo="Assets\\Square44x44Logo.png" />
    </Application>
  </Applications>
  <Capabilities>
    <rescap:Capability Name="runFullTrust" />
  </Capabilities>
</Package>
`,
);

// makeappx comes with the Windows SDK; the newest one installed is used.
const kits = "C:/Program Files (x86)/Windows Kits/10/bin";
const sdk = readdirSync(kits)
  .filter((name) => /^10\./.test(name))
  .sort()
  .at(-1);
mkdirSync("out", { recursive: true });
execFileSync(
  join(kits, sdk, "x64", "makeappx.exe"),
  ["pack", "/o", "/d", dir, "/p", "out/Skrivro.msix"],
  {
    stdio: "inherit",
  },
);
rmSync(dir, { recursive: true });
say("Klart: out/Skrivro.msix. Ladda upp den under Packages i Partner Center.");
