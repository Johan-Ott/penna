import type { KeyValueStorage } from "../storage/keyValueStore.js";

const forgetfulStorage: KeyValueStorage = { getItem: () => null, setItem: () => undefined };

// Reading localStorage itself can throw when the webview blocks storage.
export function browserStorage(): KeyValueStorage {
  try {
    return window.localStorage;
  } catch {
    return forgetfulStorage;
  }
}
