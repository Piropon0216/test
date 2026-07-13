import { useState } from "react";
import { FREQUENCY_OPTIONS, DEFAULT_TARGET_DAYS_PER_WEEK } from "../constants";

export default function AddHabitForm({ onAdd }) {
  const [name, setName] = useState("");
  const [targetDaysPerWeek, setTargetDaysPerWeek] = useState(DEFAULT_TARGET_DAYS_PER_WEEK);

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed, targetDaysPerWeek);
    setName("");
    setTargetDaysPerWeek(DEFAULT_TARGET_DAYS_PER_WEEK);
  }

  const fieldStyle = {
    border: "none",
    background: "var(--bg)",
    borderRadius: "var(--radius-md)",
    padding: "10px 14px",
    fontSize: 14,
    fontWeight: 700,
    color: "var(--ink)",
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="card"
      style={{ display: "flex", gap: 8, padding: 12 }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="新しい習慣を追加(例: water 1L)"
        style={{ ...fieldStyle, flex: 1 }}
      />
      <select
        value={targetDaysPerWeek}
        onChange={(e) => setTargetDaysPerWeek(Number(e.target.value))}
        aria-label="頻度"
        style={{ ...fieldStyle, flex: "0 0 auto" }}
      >
        {FREQUENCY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        style={{
          border: "none",
          background: "var(--accent-strong)",
          color: "#fff",
          fontWeight: 800,
          borderRadius: "var(--radius-md)",
          padding: "0 18px",
          cursor: "pointer",
        }}
      >
        追加
      </button>
    </form>
  );
}
