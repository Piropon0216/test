import { describe, expect, it } from "vitest";
import {
  addDays,
  allHabitsDoneOn,
  anyHabitDoneOn,
  countCompletionsInWeek,
  daysBetween,
  getLevelProgress,
  getStage,
  isHabitDoneOn,
  isHabitSatisfiedOn,
  levelFromXp,
  startOfWeekStr,
  todayStr,
  xpForLevel,
  yesterdayStr,
} from "./utils";

describe("todayStr / addDays / yesterdayStr", () => {
  it("formats a date as YYYY-MM-DD", () => {
    expect(todayStr(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("adds days across a month boundary", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
  });

  it("subtracts days across a year boundary", () => {
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("yesterdayStr is the inverse of adding a day", () => {
    expect(yesterdayStr("2026-03-02")).toBe("2026-03-01");
  });
});

describe("xpForLevel / levelFromXp", () => {
  it("requires 0 XP for level 1", () => {
    expect(xpForLevel(1)).toBe(0);
  });

  it("increases the XP requirement each level", () => {
    const gap2to3 = xpForLevel(3) - xpForLevel(2);
    const gap3to4 = xpForLevel(4) - xpForLevel(3);
    expect(gap3to4).toBeGreaterThan(gap2to3);
  });

  it("stays at level 1 below the level-2 floor", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(xpForLevel(2) - 1)).toBe(1);
  });

  it("reaches level 2 exactly at its XP floor", () => {
    expect(levelFromXp(xpForLevel(2))).toBe(2);
  });
});

describe("getLevelProgress", () => {
  it("reports 0 progress at the start of a level", () => {
    const { level, xpIntoLevel, progress } = getLevelProgress(xpForLevel(3));
    expect(level).toBe(3);
    expect(xpIntoLevel).toBe(0);
    expect(progress).toBe(0);
  });

  it("reports partial progress toward the next level", () => {
    const halfway = xpForLevel(2) + (xpForLevel(3) - xpForLevel(2)) / 2;
    const { progress } = getLevelProgress(halfway);
    expect(progress).toBeCloseTo(0.5);
  });
});

describe("getStage", () => {
  it("starts at たまご for level 1", () => {
    expect(getStage(1).name).toBe("たまご");
  });

  it("evolves to ベビー at level 3", () => {
    expect(getStage(3).name).toBe("ベビー");
  });

  it("reaches 伝説 at level 25 and beyond", () => {
    expect(getStage(25).name).toBe("伝説");
    expect(getStage(999).name).toBe("伝説");
  });
});

describe("habit completion helpers", () => {
  const today = "2026-07-12";
  const habitDone = { completedDates: [today] };
  const habitNotDone = { completedDates: ["2026-07-11"] };

  it("isHabitDoneOn checks a specific date", () => {
    expect(isHabitDoneOn(habitDone, today)).toBe(true);
    expect(isHabitDoneOn(habitNotDone, today)).toBe(false);
  });

  it("allHabitsDoneOn requires at least one habit and full completion", () => {
    expect(allHabitsDoneOn([], today)).toBe(false);
    expect(allHabitsDoneOn([habitDone], today)).toBe(true);
    expect(allHabitsDoneOn([habitDone, habitNotDone], today)).toBe(false);
  });

  it("anyHabitDoneOn is true if at least one habit is done", () => {
    expect(anyHabitDoneOn([habitNotDone], today)).toBe(false);
    expect(anyHabitDoneOn([habitDone, habitNotDone], today)).toBe(true);
  });
});

describe("daysBetween", () => {
  it("is 0 for the same day", () => {
    expect(daysBetween("2026-07-12", "2026-07-12")).toBe(0);
  });

  it("is 1 for consecutive days", () => {
    expect(daysBetween("2026-07-12", "2026-07-13")).toBe(1);
  });

  it("counts across a month boundary", () => {
    expect(daysBetween("2026-07-31", "2026-08-02")).toBe(2);
  });
});

describe("startOfWeekStr", () => {
  it("returns the same date for a Monday", () => {
    // 2026-07-13 is a Monday
    expect(startOfWeekStr("2026-07-13")).toBe("2026-07-13");
  });

  it("returns the preceding Monday for a Sunday", () => {
    expect(startOfWeekStr("2026-07-19")).toBe("2026-07-13");
  });
});

describe("weekly-frequency habits", () => {
  const monday = "2026-07-13";
  const wednesday = "2026-07-15";
  const friday = "2026-07-17";

  it("countCompletionsInWeek only counts the current week up to the given date", () => {
    const habit = { completedDates: ["2026-07-06", monday, wednesday] }; // 07-06 is last week
    expect(countCompletionsInWeek(habit, wednesday)).toBe(2);
  });

  it("a daily (target 7) habit is only satisfied by doing it today", () => {
    const habit = { targetDaysPerWeek: 7, completedDates: [monday] };
    expect(isHabitSatisfiedOn(habit, monday)).toBe(true);
    expect(isHabitSatisfiedOn(habit, wednesday)).toBe(false);
  });

  it("a weekly-target habit is satisfied once its quota is met, even on off days", () => {
    const habit = { targetDaysPerWeek: 2, completedDates: [monday, wednesday] };
    expect(isHabitSatisfiedOn(habit, friday)).toBe(true);
  });

  it("a weekly-target habit is not satisfied before its quota is met", () => {
    const habit = { targetDaysPerWeek: 2, completedDates: [monday] };
    expect(isHabitSatisfiedOn(habit, wednesday)).toBe(false);
  });

  it("allHabitsDoneOn treats a met weekly quota as done for bonus-XP purposes", () => {
    const daily = { targetDaysPerWeek: 7, completedDates: [friday] };
    const weekly = { targetDaysPerWeek: 2, completedDates: [monday, wednesday] };
    expect(allHabitsDoneOn([daily, weekly], friday)).toBe(true);
  });
});
