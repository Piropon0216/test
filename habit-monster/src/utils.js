import { EVOLUTION_STAGES } from "./constants";

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

export function allHabitsDoneOn(habits, dateStr) {
  return habits.length > 0 && habits.every((h) => isHabitDoneOn(h, dateStr));
}

export function anyHabitDoneOn(habits, dateStr) {
  return habits.some((h) => isHabitDoneOn(h, dateStr));
}

export function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
