export const XP_PER_HABIT = 10;
export const STREAK_BONUS_XP = 5;

// 進化段階。minLevel 以上でその段階になる(高いものから判定)。
export const EVOLUTION_STAGES = [
  { name: "伝説", minLevel: 25, emoji: "🐉" },
  { name: "成体", minLevel: 15, emoji: "🦖" },
  { name: "少年期", minLevel: 10, emoji: "🐲" },
  { name: "こども", minLevel: 6, emoji: "🐥" },
  { name: "ベビー", minLevel: 3, emoji: "🐣" },
  { name: "たまご", minLevel: 1, emoji: "🥚" },
];

export const DEFAULT_MONSTER_NAME = "モンモン";

export const STORAGE_KEY = "habit-monster:v1";
