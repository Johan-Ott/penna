// Windows reports a file locked by a sync client as "access denied", so the two share one reason.
export type SaveFailure = "blocked" | "diskFull" | "readOnly" | "folderMissing" | "unknown";

const BY_NODE_CODE: Record<string, SaveFailure> = {
  EPERM: "blocked",
  EBUSY: "blocked",
  EACCES: "blocked",
  ENOSPC: "diskFull",
  EROFS: "readOnly",
  ENOENT: "folderMissing",
};

// Tauri passes Rust io errors as text that ends in "(os error N)" with the Windows number.
const BY_WINDOWS_ERROR: Record<string, SaveFailure> = {
  "5": "blocked",
  "32": "blocked",
  "33": "blocked",
  "112": "diskFull",
  "19": "readOnly",
  "2": "folderMissing",
  "3": "folderMissing",
};

export function describeSaveError(error: unknown): SaveFailure {
  const code = (error as { code?: unknown } | null)?.code;
  if (typeof code === "string" && code in BY_NODE_CODE) return BY_NODE_CODE[code] ?? "unknown";
  const windowsError = /\(os error (\d+)\)/.exec(String(error))?.[1];
  if (windowsError) return BY_WINDOWS_ERROR[windowsError] ?? "unknown";
  return "unknown";
}
