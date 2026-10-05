import { describe, expect, it } from "vitest";
import {
  averagePerDay,
  daysBetween,
  deadlinePlan,
  heatmap,
  longestStreak,
  projectGoals,
  shortDay,
} from "../src/project/progress";

describe("deadlinePlan", () => {
  it("spreads the words left over the days left: 31 790 in 105 days is 303 a day", () => {
    const plan = deadlinePlan(
      { words: 48_210, goal: 80_000, deadline: "2027-01-15" },
      "2026-10-02",
      940,
    );

    expect(plan).toEqual({ daysLeft: 105, wordsPerDay: 303, isOnTrack: true });
  });

  it("is behind when the average is lower than what is needed", () => {
    const plan = deadlinePlan(
      { words: 10_000, goal: 80_000, deadline: "2026-11-01" },
      "2026-10-02",
      500,
    );

    expect(plan).toMatchObject({ daysLeft: 30, wordsPerDay: 2334, isOnTrack: false });
  });

  it("needs nothing more once the goal is reached, and nothing without a deadline or goal", () => {
    const plans = [
      deadlinePlan({ words: 90_000, goal: 80_000, deadline: "2027-01-15" }, "2026-10-02", 0),
      deadlinePlan({ words: 1000, goal: 80_000, deadline: null }, "2026-10-02", 0),
      deadlinePlan({ words: 1000, goal: null, deadline: "2027-01-15" }, "2026-10-02", 0),
    ];

    expect(plans).toEqual([{ daysLeft: 105, wordsPerDay: 0, isOnTrack: true }, null, null]);
  });

  it("counts the deadline day itself as gone once it has passed", () => {
    const plan = deadlinePlan({ words: 1000, goal: 2000, deadline: "2026-10-01" }, "2026-10-02", 0);

    expect(plan).toEqual({ daysLeft: 0, wordsPerDay: 1000, isOnTrack: false });
  });
});

describe("days and streaks", () => {
  it("counts whole days between two dates, across a summer time change", () => {
    const days = [daysBetween("2026-10-02", "2027-01-15"), daysBetween("2026-03-28", "2026-03-30")];

    expect(days).toEqual([105, 2]);
  });

  it("finds the longest run of days with words", () => {
    const stats = {
      "2026-09-01": 5,
      "2026-09-02": 5,
      "2026-09-03": 5,
      "2026-09-10": 5,
      "2026-09-11": 5,
    };

    const longest = longestStreak(stats);

    expect(longest).toBe(3);
  });

  it("averages the last 30 days, days without words included", () => {
    const stats = { "2026-10-02": 600, "2026-09-20": 300, "2026-08-01": 9000 };

    const average = averagePerDay(stats, "2026-10-02");

    expect(average).toBe(30);
  });
});

describe("heatmap", () => {
  it("gives 12 weeks of days, Monday first, ending with the current week", () => {
    const cells = heatmap({}, "2026-10-02", 1000);

    expect(cells).toHaveLength(84);
    expect(cells[0]?.day).toBe("2026-07-13");
    expect(cells[83]?.day).toBe("2026-10-04");
  });

  it("shades a day by how much of the daily goal was written, and leaves the future empty", () => {
    const stats = { "2026-09-28": 200, "2026-09-29": 600, "2026-09-30": 1000, "2026-10-01": 1600 };

    const levels = heatmap(stats, "2026-10-02", 1000)
      .slice(77)
      .map((cell) => cell.level);

    expect(levels).toEqual([1, 2, 3, 4, 0, null, null]);
  });
});

describe("projectGoals", () => {
  it("reads the goals from project.json, ignoring what does not make sense", () => {
    const goals = [
      projectGoals({ dailyGoal: 500, totalGoal: 80_000, deadline: "2027-01-15" }),
      projectGoals({ dailyGoal: "mycket", totalGoal: -1, deadline: "snart" }),
    ];

    expect(goals).toEqual([
      { dailyGoal: 500, totalGoal: 80_000, deadline: "2027-01-15" },
      { dailyGoal: null, totalGoal: null, deadline: null },
    ]);
  });
});

describe("shortDay", () => {
  it("writes a date the Swedish way, without a leading zero", () => {
    const days = [shortDay("2027-01-15"), shortDay("2026-10-02")];

    expect(days).toEqual(["15 jan", "2 okt"]);
  });
});
