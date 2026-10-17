import { isMac } from "../thisComputer.js";

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

// Tauri passes Rust io errors as text that ends in "(os error N)", numbered by the system itself,
// so one number means different things on Windows and on a Mac.
const BY_WINDOWS_ERROR: Record<string, SaveFailure> = {
  "5": "blocked",
  "32": "blocked",
  "33": "blocked",
  "112": "diskFull",
  "19": "readOnly",
  "2": "folderMissing",
  "3": "folderMissing",
};

// A Mac numbers them by errno, which carries the same names as Node's codes.
const MAC_ERRNO: Record<string, string> = {
  "1": "EPERM",
  "2": "ENOENT",
  "13": "EACCES",
  "16": "EBUSY",
  "28": "ENOSPC",
  "30": "EROFS",
};

const BY_MAC_ERROR: Record<string, SaveFailure> = Object.fromEntries(
  Object.entries(MAC_ERRNO).map(([number, code]) => [number, BY_NODE_CODE[code] ?? "unknown"]),
);

function byNodeCode(error: unknown): SaveFailure | undefined {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" ? BY_NODE_CODE[code] : undefined;
}

function bySystemNumber(error: unknown, isMacComputer: boolean): SaveFailure | undefined {
  const number = /\(os error (\d+)\)/.exec(String(error))?.[1];
  const bySystem = isMacComputer ? BY_MAC_ERROR : BY_WINDOWS_ERROR;
  return number ? bySystem[number] : undefined;
}

export function describeSaveError(error: unknown, isMacComputer = isMac): SaveFailure {
  return byNodeCode(error) ?? bySystemNumber(error, isMacComputer) ?? "unknown";
}
