import { describe, expect, it } from "vitest";
import { describeSaveError } from "../src/storage/saveError";

const nodeError = (code: string) => Object.assign(new Error(code), { code });

describe("describeSaveError", () => {
  it("reports a file held by another program or protected as blocked", () => {
    const reasons = [
      describeSaveError(nodeError("EPERM")),
      describeSaveError(nodeError("EBUSY")),
      describeSaveError(nodeError("EACCES")),
      describeSaveError("failed to rename file: Access is denied. (os error 5)"),
      describeSaveError("The process cannot access the file (os error 32)"),
    ];

    expect(reasons).toEqual(["blocked", "blocked", "blocked", "blocked", "blocked"]);
  });

  it("reports a full disk", () => {
    const reasons = [
      describeSaveError(nodeError("ENOSPC")),
      describeSaveError("There is not enough space on the disk. (os error 112)"),
    ];

    expect(reasons).toEqual(["diskFull", "diskFull"]);
  });

  it("reports a read-only file system", () => {
    const reasons = [
      describeSaveError(nodeError("EROFS")),
      describeSaveError("The media is write protected. (os error 19)"),
    ];

    expect(reasons).toEqual(["readOnly", "readOnly"]);
  });

  it("reports a folder that is gone", () => {
    const reasons = [
      describeSaveError(nodeError("ENOENT")),
      describeSaveError("The system cannot find the path specified. (os error 3)"),
    ];

    expect(reasons).toEqual(["folderMissing", "folderMissing"]);
  });

  it("reports anything else as unknown", () => {
    const reason = describeSaveError(new Error("something odd"));

    expect(reason).toBe("unknown");
  });
});
