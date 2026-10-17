export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** An empty object when there is none or it cannot be read. */
export function readStoredObject(storage: KeyValueStorage, key: string): Record<string, unknown> {
  try {
    const stored: unknown = JSON.parse(storage.getItem(key) ?? "{}");
    return typeof stored === "object" && stored !== null ? (stored as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

// A blocked storage only means the value is not remembered; the app goes on.
export function writeStored(storage: KeyValueStorage, key: string, value: unknown) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
}
