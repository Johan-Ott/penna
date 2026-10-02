import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAutosave, type SaveStatus } from "../src/storage/autosave";

const blockedError = Object.assign(new Error("blocked"), { code: "EPERM" });

function setup(failures = 0) {
  const written: string[] = [];
  const statuses: SaveStatus[] = [];
  let failuresLeft = failures;
  const autosave = createAutosave({
    write: async (text) => {
      if (failuresLeft > 0) {
        failuresLeft -= 1;
        throw blockedError;
      }
      written.push(text);
    },
    onStatus: (status) => statuses.push(status),
  });
  autosave.loaded("start");
  return { autosave, written, statuses };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("autosave", () => {
  it("saves one second after the writer pauses", async () => {
    const { autosave, written } = setup();

    autosave.changed("Brev");
    autosave.changed("Brevet");
    await vi.advanceTimersByTimeAsync(999);
    const beforePause = [...written];
    await vi.advanceTimersByTimeAsync(1);

    expect(beforePause).toEqual([]);
    expect(written).toEqual(["Brevet"]);
    expect(autosave.hasUnsavedText()).toBe(false);
  });

  it("does not write text that is already saved", async () => {
    const { autosave, written } = setup();

    autosave.changed("start");
    await vi.advanceTimersByTimeAsync(1000);

    expect(written).toEqual([]);
  });

  it("keeps the text and retries every ten seconds when a save fails", async () => {
    const { autosave, written, statuses } = setup(2);

    autosave.changed("Brevet");
    await vi.advanceTimersByTimeAsync(1000);
    const afterFirstFailure = statuses.at(-1);
    await vi.advanceTimersByTimeAsync(10_000);
    await vi.advanceTimersByTimeAsync(10_000);

    expect(afterFirstFailure).toEqual({ kind: "failed", reason: "blocked" });
    expect(written).toEqual(["Brevet"]);
    expect(statuses.at(-1)?.kind).toBe("saved");
  });

  it("clears a failure when the text is undone back to what is saved", async () => {
    const { autosave, written, statuses } = setup(1);

    autosave.changed("Brevet");
    await vi.advanceTimersByTimeAsync(1000);
    autosave.changed("start");
    await vi.advanceTimersByTimeAsync(1000);

    expect(written).toEqual([]);
    expect(statuses.map((status) => status.kind)).toEqual(["failed", "saved"]);
  });

  it("reports whether flush managed to save", async () => {
    const { autosave } = setup(1);
    autosave.changed("Brevet");

    const firstFlush = await autosave.flush();
    const secondFlush = await autosave.flush();

    expect(firstFlush).toBe(false);
    expect(secondFlush).toBe(true);
  });

  it("does not save while held, and saves the held text on release", async () => {
    const { autosave, written } = setup();

    autosave.hold();
    autosave.changed("skrivet under konflikt");
    await vi.advanceTimersByTimeAsync(5000);
    const whileHeld = [...written];
    autosave.release();
    await autosave.flush();

    expect(whileHeld).toEqual([]);
    expect(written).toEqual(["skrivet under konflikt"]);
  });

  it("treats text loaded from disk as saved", () => {
    const { autosave } = setup();

    autosave.loaded("från disken");

    expect(autosave.hasUnsavedText()).toBe(false);
    expect(autosave.lastSavedText()).toBe("från disken");
  });
});
