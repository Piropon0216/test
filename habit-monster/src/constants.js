export const XP_PER_HABIT = 10;
export const STREAK_BONUS_XP = 5;

// ストリークフリーズ: 7日連続達成ごとに1個獲得(上限3個)。
// ちょうど1日だけ抜けた場合に消費してストリークを継続できる(2日以上の空きには使えない)。
export const STREAK_FREEZE_INTERVAL = 7;
export const MAX_STREAK_FREEZES = 3;

// 習慣ごとの週目標日数。7=毎日。
export const DEFAULT_TARGET_DAYS_PER_WEEK = 7;
export const FREQUENCY_OPTIONS = [
  { value: 7, label: "毎日" },
  { value: 5, label: "週5回" },
  { value: 3, label: "週3回" },
  { value: 1, label: "週1回" },
];

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
