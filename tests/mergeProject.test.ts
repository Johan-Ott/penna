import { describe, expect, it } from "vitest";
import { mergeProjectText } from "../src/sync/mergeProject";

const scene = (id: string) => ({ id, kind: "scene" });
const file = (fields: Record<string, unknown>, tree: unknown[]) =>
  JSON.stringify({ ...fields, tree });
const parsed = (merged: { text: string }) => JSON.parse(merged.text) as Record<string, unknown>;

describe("mergeProjectText", () => {
  it("takes each setting from the side that changed it", () => {
    const base = file({ title: "Isen", language: "sv-SE", dailyGoal: 500 }, []);
    const here = file({ title: "Isen", language: "sv-SE", dailyGoal: 800 }, []);
    const drive = file({ title: "Vintervägen", language: "sv-SE", dailyGoal: 500 }, []);

    const merged = parsed(mergeProjectText(base, here, drive));

    expect(merged).toMatchObject({ title: "Vintervägen", dailyGoal: 800, language: "sv-SE" });
  });

  it("keeps this device's value when both changed the same setting", () => {
    const base = file({ dailyGoal: 500 }, []);

    const merged = parsed(
      mergeProjectText(base, file({ dailyGoal: 800 }, []), file({ dailyGoal: 1000 }, [])),
    );

    expect(merged["dailyGoal"]).toBe(800);
  });

  it("takes the structure from the side that changed it", () => {
    const base = file({}, [scene("S1")]);
    const drive = file({}, [scene("S1"), scene("S2")]);

    const merged = parsed(mergeProjectText(base, base, drive));

    expect(merged["tree"]).toEqual([scene("S1"), scene("S2")]);
  });

  it("merges the structure scene by scene when both changed it", () => {
    const base = file({}, [scene("S1")]);
    const here = file({}, [scene("S1"), scene("S3")]);
    const drive = file({}, [scene("S1"), scene("S2")]);

    expect(parsed(mergeProjectText(base, here, drive))["tree"]).toEqual([
      scene("S1"),
      scene("S2"),
      scene("S3"),
    ]);
  });

  it("treats a first sync with no earlier version as both sides changed", () => {
    const merged = parsed(
      mergeProjectText(
        null,
        file({ title: "Isen" }, []),
        file({ title: "X", series: "Ö.serie" }, []),
      ),
    );

    expect(merged).toMatchObject({ title: "Isen", series: "Ö.serie" });
  });

  it("keeps a setting this device removed", () => {
    const base = file({ series: "Ö.serie" }, []);

    expect(parsed(mergeProjectText(base, file({}, []), base))).not.toHaveProperty("series");
  });

  it("keeps this device's file when the other side cannot be read", () => {
    const here = file({ title: "Isen" }, []);

    expect(mergeProjectText(null, here, "{trasig").text).toBe(here);
  });
});
