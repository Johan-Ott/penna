import { describe, expect, it } from "vitest";
import { DEFAULT_STEPS, ownStepName, statusSteps, withStep } from "../src/project/statusSteps";
import { bookStatus } from "../src/project/shelf";

describe("status steps", () => {
  it("are the standard four until the book names its own", () => {
    expect(statusSteps({})).toEqual(DEFAULT_STEPS);
  });

  it("take the book's own name and colour for one step, keeping the others", () => {
    const fields = withStep({}, "utkast", { name: "Första utkast", color: "#7a5cc9" });

    expect(statusSteps(fields).utkast).toEqual({ name: "Första utkast", color: "#7a5cc9" });
    expect(statusSteps(fields).klar).toEqual(DEFAULT_STEPS.klar);
    expect(ownStepName(fields, "klar")).toBeNull();
  });

  it("give the shelf the book's own name for its stage", () => {
    const fields = withStep({}, "redigering", { name: "Hos redaktören" });

    expect(bookStatus([{ words: 10, status: "redigering" }], fields)).toBe("Hos redaktören");
  });
});
