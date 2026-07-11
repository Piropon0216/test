import { useEffect, useRef, useState } from "react";
import Shell from "./components/Shell";
import Header from "./components/Header";
import SectionLabel from "./components/SectionLabel";
import MonsterCard from "./components/MonsterCard";
import HabitLog from "./components/HabitLog";
import AddHabitForm from "./components/AddHabitForm";
import ChatPanel from "./components/ChatPanel";
import { loadState, saveState } from "./storage";
import { DEFAULT_MONSTER_NAME, XP_PER_HABIT, STREAK_BONUS_XP } from "./constants";
import {
  todayStr,
  yesterdayStr,
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
  },
  habits: [],
};

export default function App() {
  const [state, setState] = useState(INITIAL_STATE);
  const [ready, setReady] = useState(false);
  const hasLoaded = useRef(false);

  useEffect(() => {
    loadState().then((saved) => {
      if (saved) setState(saved);
      hasLoaded.current = true;
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) return;
    saveState(state);
  }, [state]);

  function addHabit(name) {
    setState((prev) => ({
      ...prev,
      habits: [
        ...prev.habits,
        { id: makeId(), name, createdAt: todayStr(), completedDates: [] },
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
        monster.streak =
          monster.lastCompletionDate === yesterdayStr(today) ? monster.streak + 1 : 1;
        monster.lastCompletionDate = today;
      } else if (wasDone && !stillAnyDoneToday && monster.lastCompletionDate === today) {
        // 今日の完了を全部取り消した → ストリークを巻き戻す
        monster.streak = monster.streakBeforeToday ?? 0;
        monster.lastCompletionDate = null;
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
      <MonsterCard xp={state.monster.xp} streak={state.monster.streak} />

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
