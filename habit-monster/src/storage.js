import { STORAGE_KEY } from "./constants";

// Claude.ai アーティファクト環境の window.storage があればそれを使い、
// なければ localStorage にフォールバックする永続化レイヤー。
// (詳細は HANDOFF.md の論点#1を参照 — 複数端末同期が必要になれば要置き換え)

function hasArtifactStorage() {
  return typeof window !== "undefined" && typeof window.storage === "object" && window.storage !== null;
}

export async function loadState() {
  try {
    if (hasArtifactStorage()) {
      const raw = await window.storage.get(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    }
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    }
  } catch (err) {
    console.error("habit-monster: failed to load state", err);
  }
  return null;
}

export async function saveState(state) {
  const serialized = JSON.stringify(state);
  try {
    if (hasArtifactStorage()) {
      await window.storage.set(STORAGE_KEY, serialized);
      return;
    }
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, serialized);
    }
  } catch (err) {
    console.error("habit-monster: failed to save state", err);
  }
}
