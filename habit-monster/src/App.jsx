import { useEffect, useRef, useState } from "react";
import Shell from "./components/Shell";
import Header from "./components/Header";
import SectionLabel from "./components/SectionLabel";
import MonsterCard from "./components/MonsterCard";
import HabitLog from "./components/HabitLog";
import AddHabitForm from "./components/AddHabitForm";
import ChatPanel from "./components/ChatPanel";
import { loadState, saveState } from "./storage";
import {
  DEFAULT_MONSTER_NAME,
  XP_PER_HABIT,
  STREAK_BONUS_XP,
  STREAK_FREEZE_INTERVAL,
  MAX_STREAK_FREEZES,
  DEFAULT_TARGET_DAYS_PER_WEEK,
} from "./constants";
import {
  todayStr,
  daysBetween,
  anyHabitDoneOn,
  allHabitsDoneOn,
  isHabitDoneOn,
  makeId,
  getLevelProgress,
  getStage,
} from "./utils";

const INITIAL_STATE = {
  monster: {
    name: DEFAULT_MONSTER_NAME,
    xp: 0,
    streak: 0,
    lastCompletionDate: null,
    streakBeforeToday: 0,
    bonusAwardedDate: null,
    streakFreezes: 0,
    freezesBeforeToday: 0,
    usedFreezeToday: false,
  },
  habits: [],
};

export default function App() {
  const [state, setState] = useState(INITIAL_STATE);
  const [ready, setReady] = useState(false);
  const hasLoaded = useRef(false);

  useEffect(() => {
    loadState().then((saved) => {
      if (saved) {
        // 古い保存データに新フィールドが無くても壊れないよう既定値とマージする
        setState({
          monster: { ...INITIAL_STATE.monster, ...saved.monster },
          habits: saved.habits ?? [],
        });
      }
      hasLoaded.current = true;
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) return;
    saveState(state);
  }, [state]);

  function addHabit(name, targetDaysPerWeek = DEFAULT_TARGET_DAYS_PER_WEEK) {
    setState((prev) => ({
      ...prev,
      habits: [
        ...prev.habits,
        { id: makeId(), name, createdAt: todayStr(), completedDates: [], targetDaysPerWeek },
      ],
    }));
  }

  function deleteHabit(id) {
    setState((prev) => ({
      ...prev,
      habits: prev.habits.filter((h) => h.id !== id),
    }));
  }

  function toggleHabit(id) {
    const today = todayStr();

    setState((prev) => {
      const wasDone = isHabitDoneOn(
        prev.habits.find((h) => h.id === id) ?? { completedDates: [] },
        today
      );

      const nextHabits = prev.habits.map((h) => {
        if (h.id !== id) return h;
        const completedDates = wasDone
          ? h.completedDates.filter((d) => d !== today)
          : [...h.completedDates, today];
        return { ...h, completedDates };
      });

      let monster = { ...prev.monster };
      monster.xp = Math.max(0, monster.xp + (wasDone ? -XP_PER_HABIT : XP_PER_HABIT));

      const stillAnyDoneToday = anyHabitDoneOn(nextHabits, today);

      if (!wasDone && monster.lastCompletionDate !== today) {
        // 今日はじめての完了 → ストリーク更新
        monster.streakBeforeToday = monster.streak;
        monster.freezesBeforeToday = monster.streakFreezes;
        monster.usedFreezeToday = false;

        const gap = monster.lastCompletionDate ? daysBetween(monster.lastCompletionDate, today) : null;
        if (gap === 1) {
          monster.streak += 1;
        } else if (gap === 2 && monster.streakFreezes > 0) {
          // ちょうど1日だけ抜けた → フリーズを1個消費してストリークを継続
          monster.streak += 1;
          monster.streakFreezes -= 1;
          monster.usedFreezeToday = true;
        } else {
          monster.streak = 1;
        }

        if (!monster.usedFreezeToday && monster.streak % STREAK_FREEZE_INTERVAL === 0) {
          monster.streakFreezes = Math.min(MAX_STREAK_FREEZES, monster.streakFreezes + 1);
        }

        monster.lastCompletionDate = today;
      } else if (wasDone && !stillAnyDoneToday && monster.lastCompletionDate === today) {
        // 今日の完了を全部取り消した → ストリーク・フリーズを巻き戻す
        monster.streak = monster.streakBeforeToday ?? 0;
        monster.streakFreezes = monster.freezesBeforeToday ?? monster.streakFreezes;
        monster.lastCompletionDate = null;
        monster.usedFreezeToday = false;
      }

      if (!wasDone && allHabitsDoneOn(nextHabits, today) && monster.bonusAwardedDate !== today) {
        monster.xp += STREAK_BONUS_XP;
        monster.bonusAwardedDate = today;
      } else if (wasDone && monster.bonusAwardedDate === today) {
        monster.xp = Math.max(0, monster.xp - STREAK_BONUS_XP);
        monster.bonusAwardedDate = null;
      }

      return { ...prev, monster, habits: nextHabits };
    });
  }

  if (!ready) {
    return (
      <Shell>
        <div style={{ textAlign: "center", padding: 40, color: "var(--ink-soft)" }}>読み込み中…</div>
      </Shell>
    );
  }

  const { level } = getLevelProgress(state.monster.xp);
  const stage = getStage(level);
  const today = todayStr();

  return (
    <Shell>
      <Header monsterName={state.monster.name} level={level} />
      <MonsterCard
        xp={state.monster.xp}
        streak={state.monster.streak}
        streakFreezes={state.monster.streakFreezes}
        usedFreezeToday={state.monster.usedFreezeToday && state.monster.lastCompletionDate === today}
      />

      <div>
        <SectionLabel>今日の習慣</SectionLabel>
        <HabitLog
          habits={state.habits}
          today={today}
          onToggle={toggleHabit}
          onDelete={deleteHabit}
        />
      </div>

      <AddHabitForm onAdd={addHabit} />

      <div>
        <SectionLabel>おしゃべり</SectionLabel>
        <ChatPanel monsterName={state.monster.name} stageName={stage.name} level={level} />
      </div>
    </Shell>
  );
}
