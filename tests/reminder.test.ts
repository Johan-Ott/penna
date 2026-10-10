import { describe, expect, it } from "vitest";
import { isReminderDue, nextReminder } from "../src/app/reminder";

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

describe("nextReminder", () => {
  const morning = new Date(2026, 9, 10, 9, 0).getTime();
  const night = new Date(2026, 9, 10, 22, 0).getTime();

  it("is tonight before anything is written, and tomorrow once something is", () => {
    expect(nextReminder(20, morning, 0)).toEqual(new Date(2026, 9, 10, 20, 0));
    expect(nextReminder(20, morning, 120)).toEqual(new Date(2026, 9, 11, 20, 0));
  });

  it("is tomorrow when the hour has passed, and nothing when it is off", () => {
    expect(nextReminder(20, night, 0)).toEqual(new Date(2026, 9, 11, 20, 0));
    expect(nextReminder(null, morning, 0)).toBeNull();
  });
});
