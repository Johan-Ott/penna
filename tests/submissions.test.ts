import { describe, expect, it } from "vitest";
import { letterDocx } from "../src/export/letterDocx";
import { submissionsOf, withSubmission } from "../src/project/submissions";

const row = { id: "a", to: "Bonniers", sent: "2026-10-09", status: "skickat" as const, note: "" };

describe("submissions", () => {
  it("reads only well-formed submissions, and changes one by its id", () => {
    const fields = { submissions: [row, { id: "b", to: "X", status: "kanske" }] };

    expect(submissionsOf(fields)).toEqual([row]);
    expect(withSubmission([row], "a", { status: "ja" })).toEqual([{ ...row, status: "ja" }]);
  });

  it("saves a synopsis as a Word file", async () => {
    const bytes = await letterDocx({
      heading: "Synopsis · Vintervägen",
      text: "Elin får ett brev.\n\nHon åker hem.",
      author: "Elin Berg",
      language: "sv-SE",
    });

    expect(String.fromCharCode(bytes[0] ?? 0, bytes[1] ?? 0)).toBe("PK");
  });
});
