import { describe, expect, it } from "vitest";
import { describeSaveError } from "@llkit/storage/saveError.js";

const nodeError = (code: string) => Object.assign(new Error(code), { code });

describe("describeSaveError", () => {
  it("reports a file held by another program or protected as blocked", () => {
    const reasons = [
      describeSaveError(nodeError("EPERM")),
      describeSaveError(nodeError("EBUSY")),
      describeSaveError(nodeError("EACCES")),
      describeSaveError("failed to rename file: Access is denied. (os error 5)"),
      describeSaveError("The process cannot access the file (os error 32)"),
      describeSaveError("Permission denied (os error 13)", true),
      describeSaveError("Resource busy (os error 16)", true),
    ];

    expect(reasons).toEqual(Array(7).fill("blocked"));
  });

  it("reports a full disk", () => {
    const reasons = [
      describeSaveError(nodeError("ENOSPC")),
      describeSaveError("There is not enough space on the disk. (os error 112)"),
      describeSaveError("No space left on device (os error 28)", true),
    ];

    expect(reasons).toEqual(["diskFull", "diskFull", "diskFull"]);
  });

  it("reports a read-only file system", () => {
    const reasons = [
      describeSaveError(nodeError("EROFS")),
      describeSaveError("The media is write protected. (os error 19)"),
      describeSaveError("Read-only file system (os error 30)", true),
    ];

    expect(reasons).toEqual(["readOnly", "readOnly", "readOnly"]);
  });

  it("reports a folder that is gone", () => {
    const reasons = [
      describeSaveError(nodeError("ENOENT")),
      describeSaveError("The system cannot find the path specified. (os error 3)"),
      describeSaveError("No such file or directory (os error 2)", true),
    ];

    expect(reasons).toEqual(["folderMissing", "folderMissing", "folderMissing"]);
  });

  it("reports anything else as unknown", () => {
    const reason = describeSaveError(new Error("something odd"));

    expect(reason).toBe("unknown");
  });

  it("reads the same number as the system that reported it", () => {
    const onWindows = describeSaveError("(os error 32)", false);
    const onMac = describeSaveError("(os error 32)", true);

    expect([onWindows, onMac]).toEqual(["blocked", "unknown"]);
  });
});
