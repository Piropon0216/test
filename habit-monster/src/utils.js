import { DEFAULT_TARGET_DAYS_PER_WEEK, EVOLUTION_STAGES } from "./constants";

export function todayStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(dateStr, delta) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + delta);
  return todayStr(date);
}

export function yesterdayStr(dateStr) {
  return addDays(dateStr, -1);
}

// fromStr から toStr までの日数差(UTC基準、DSTの影響を避けるため)。
export function daysBetween(fromStr, toStr) {
  const [fy, fm, fd] = fromStr.split("-").map(Number);
  const [ty, tm, td] = toStr.split("-").map(Number);
  const from = Date.UTC(fy, fm - 1, fd);
  const to = Date.UTC(ty, tm - 1, td);
  return Math.round((to - from) / 86400000);
}

// dateStr を含む週の月曜日。
export function startOfWeekStr(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const mondayOffset = (date.getDay() + 6) % 7; // 日=6, 月=0, 火=1...
  date.setDate(date.getDate() - mondayOffset);
  return todayStr(date);
}

// レベル L に到達するために必要な累計XP(L=1は0)。
// 増分が毎レベル+50されていく典型的なRPGカーブ。
export function xpForLevel(level) {
  return 25 * (level - 1) * level;
}

export function levelFromXp(xp) {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) {
    level++;
  }
  return level;
}

export function getLevelProgress(xp) {
  const level = levelFromXp(xp);
  const currentFloor = xpForLevel(level);
  const nextFloor = xpForLevel(level + 1);
  const xpIntoLevel = xp - currentFloor;
  const xpNeededForNext = nextFloor - currentFloor;
  return {
    level,
    xpIntoLevel,
    xpNeededForNext,
    progress: xpNeededForNext === 0 ? 1 : xpIntoLevel / xpNeededForNext,
  };
}

export function getStage(level) {
  return (
    EVOLUTION_STAGES.find((stage) => level >= stage.minLevel) ??
    EVOLUTION_STAGES[EVOLUTION_STAGES.length - 1]
  );
}

export function isHabitDoneOn(habit, dateStr) {
  return habit.completedDates.includes(dateStr);
}

// dateStr を含む週(月曜始まり)のうち、dateStr以前に完了した回数。
export function countCompletionsInWeek(habit, dateStr) {
  const weekStart = startOfWeekStr(dateStr);
  return habit.completedDates.filter((d) => d >= weekStart && d <= dateStr).length;
}

// 週の目標回数に対して、その日は「もうやらなくていい」状態かどうか。
// 毎日(7)の習慣はその日に完了していないと満たされない。週N回の習慣は、
// その日にやったか、既に週の目標回数に達していれば満たされたとみなす。
export function isHabitSatisfiedOn(habit, dateStr) {
  const target = habit.targetDaysPerWeek ?? DEFAULT_TARGET_DAYS_PER_WEEK;
  if (target >= 7) return isHabitDoneOn(habit, dateStr);
  return isHabitDoneOn(habit, dateStr) || countCompletionsInWeek(habit, dateStr) >= target;
}

export function allHabitsDoneOn(habits, dateStr) {
  return habits.length > 0 && habits.every((h) => isHabitSatisfiedOn(h, dateStr));
}

export function anyHabitDoneOn(habits, dateStr) {
  return habits.some((h) => isHabitDoneOn(h, dateStr));
}

export function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
