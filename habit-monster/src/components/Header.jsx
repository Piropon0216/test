import GithubStarBadge from "./GithubStarBadge";

export default function Header({ monsterName, level }) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div>
        <div style={{ fontSize: 22, fontWeight: 800 }}>{monsterName}</div>
        <div style={{ fontSize: 13, color: "var(--ink-soft)", fontWeight: 700 }}>
          Lv.{level}
        </div>
      </div>
      <GithubStarBadge owner="Piropon0216" repo="test" />
    </header>
  );
}
