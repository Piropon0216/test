import "../index.css";

export default function Shell({ children }) {
  return (
    <div className="app-shell">
      <div className="app-shell__inner">{children}</div>
    </div>
  );
}
