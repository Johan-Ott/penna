import { describe, expect, it } from "vitest";
import { isReminderDue } from "../src/app/reminder";

const evening = new Date(2026, 9, 4, 20, 5).getTime();

describe("isReminderDue", () => {
  it("reminds once a day after the chosen hour when nothing is written yet", () => {
    const due = isReminderDue({ hour: 20, now: evening, todayWords: 0, lastReminded: null });
    const again = isReminderDue({
      hour: 20,
      now: evening,
      todayWords: 0,
      lastReminded: "2026-10-04",
    });

    expect([due, again]).toEqual([true, false]);
  });

  it("stays quiet before the hour, after writing, or when it is turned off", () => {
    const base = { now: evening, lastReminded: null };

    expect(isReminderDue({ ...base, hour: 21, todayWords: 0 })).toBe(false);
    expect(isReminderDue({ ...base, hour: 20, todayWords: 12 })).toBe(false);
    expect(isReminderDue({ ...base, hour: null, todayWords: 0 })).toBe(false);
  });
});
