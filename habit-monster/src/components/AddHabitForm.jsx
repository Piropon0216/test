import { useState } from "react";

export default function AddHabitForm({ onAdd }) {
  const [name, setName] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setName("");
  }

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
        style={{
          flex: 1,
          border: "none",
          background: "var(--bg)",
          borderRadius: "var(--radius-md)",
          padding: "10px 14px",
          fontSize: 14,
          fontWeight: 700,
          color: "var(--ink)",
        }}
      />
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
