import { getLevelProgress, getStage } from "../utils";

const SIZE = 168;
const STROKE = 10;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function MonsterCard({ xp, streak }) {
  const { level, xpIntoLevel, xpNeededForNext, progress } = getLevelProgress(xp);
  const stage = getStage(level);
  const offset = CIRCUMFERENCE * (1 - Math.min(progress, 1));

  return (
    <div
      className="card"
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}
    >
      <div style={{ position: "relative", width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} style={{ transform: "rotate(-90deg)" }}>
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--ring-track)"
            strokeWidth={STROKE}
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--accent-strong)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.5s ease" }}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ fontSize: 56, lineHeight: 1 }}>{stage.emoji}</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-soft)", marginTop: 4 }}>
            {stage.name}
          </div>
        </div>
      </div>

      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 13, color: "var(--ink-soft)", fontWeight: 700 }}>
          次のレベルまで {xpIntoLevel} / {xpNeededForNext} XP
        </div>
        {streak > 0 && (
          <div style={{ fontSize: 13, color: "var(--accent-strong)", fontWeight: 800, marginTop: 4 }}>
            🔥 {streak}日連続
          </div>
        )}
      </div>
    </div>
  );
}
