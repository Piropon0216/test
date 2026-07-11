export default function SectionLabel({ children }) {
  return (
    <h2
      style={{
        margin: "0 0 4px 4px",
        fontSize: 14,
        fontWeight: 800,
        color: "var(--ink-soft)",
        letterSpacing: 0.5,
      }}
    >
      {children}
    </h2>
  );
}
