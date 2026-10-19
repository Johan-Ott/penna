// Where Windows and macOS keep an app's own files. Skrivro is built for both, so a script that
// names one of the two does nothing at all on the other.
import { posix, win32 } from "node:path";

/** Every folder an app with `identifier` owns on this computer. */
export function appFolders(platform, env, home, identifier) {
  if (platform === "win32") {
    return [env.APPDATA, env.LOCALAPPDATA]
      .filter(Boolean)
      .map((root) => win32.join(root, identifier));
  }
  if (platform === "darwin") {
    // The WebView keeps localStorage under Library/WebKit, away from the books and settings.
    return ["Application Support", "Caches", "WebKit"].map((area) =>
      posix.join(home, "Library", area, identifier),
    );
  }
  throw new Error(`Vet inte var ${platform} lägger appens mappar.`);
}

/** Where Android Studio puts the SDK when ANDROID_HOME says nothing. */
export function androidSdk(platform, env, home) {
  if (platform === "win32") return win32.join(env.LOCALAPPDATA ?? "", "Android", "Sdk");
  if (platform === "darwin") return posix.join(home, "Library", "Android", "sdk");
  throw new Error(`Android-SDK:t hittas inte för ${platform}. Sätt ANDROID_HOME.`);
}
