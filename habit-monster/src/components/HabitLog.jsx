import { isHabitDoneOn } from "../utils";

export default function HabitLog({ habits, today, onToggle, onDelete }) {
  if (habits.length === 0) {
    return (
      <div className="card" style={{ textAlign: "center", color: "var(--ink-soft)", fontSize: 14 }}>
        まだ習慣がありません。下から追加してみましょう。
      </div>
    );
  }

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {habits.map((habit) => {
        const done = isHabitDoneOn(habit, today);
        return (
          <div
            key={habit.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              borderRadius: "var(--radius-md)",
              background: done ? "var(--accent-soft)" : "var(--bg)",
            }}
          >
            <button
              onClick={() => onToggle(habit.id)}
              aria-pressed={done}
              aria-label={done ? `${habit.name} を未完了に戻す` : `${habit.name} を完了にする`}
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                border: done ? "none" : "2px solid var(--ring-track)",
                background: done ? "var(--accent-strong)" : "transparent",
                color: "#fff",
                fontWeight: 800,
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              {done ? "✓" : ""}
            </button>
            <span
              style={{
                flex: 1,
                fontWeight: 700,
                textDecoration: done ? "line-through" : "none",
                color: done ? "var(--ink-soft)" : "var(--ink)",
              }}
            >
              {habit.name}
            </span>
            <button
              onClick={() => onDelete(habit.id)}
              aria-label={`${habit.name} を削除`}
              style={{
                border: "none",
                background: "transparent",
                color: "var(--ink-soft)",
                cursor: "pointer",
                fontSize: 16,
                padding: 4,
              }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
