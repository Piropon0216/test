import { useState } from "react";

// Claude.aiアーティファクト内では window.claude.complete が使えるためAPIキー不要。
// それ以外の環境(通常デプロイ)では自前の /api/chat 経由でAnthropic APIを叩く。
// (詳細はHANDOFF.md 論点#2)
function isArtifactEnvironment() {
  return typeof window !== "undefined" && typeof window.claude?.complete === "function";
}

function buildPrompt(monsterName, stageName, level, history, userMessage) {
  const historyText = history
    .map((m) => `${m.role === "user" ? "ユーザー" : monsterName}: ${m.text}`)
    .join("\n");
  return `あなたは習慣化育成ゲームに登場するモンスター「${monsterName}」(進化段階: ${stageName}、Lv.${level})です。
ユーザーの習慣づけを励ます、優しく短い口調で返答してください。1〜2文程度に収めてください。

${historyText ? historyText + "\n" : ""}ユーザー: ${userMessage}
${monsterName}:`;
}

export default function ChatPanel({ monsterName, stageName, level }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const nextHistory = [...messages, { role: "user", text }];
    setMessages(nextHistory);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      let reply;
      if (isArtifactEnvironment()) {
        reply = await window.claude.complete(
          buildPrompt(monsterName, stageName, level, messages, text)
        );
      } else {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            monster: { name: monsterName, stage: stageName, level },
            history: messages,
            message: text,
          }),
        });
        if (!res.ok) throw new Error(`chat backend returned ${res.status}`);
        const data = await res.json();
        reply = data.reply;
      }
      setMessages([...nextHistory, { role: "monster", text: reply }]);
    } catch (err) {
      console.error("habit-monster: chat failed", err);
      setError("いまはお話しできないみたい…(チャット機能は未設定です)");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 220, overflowY: "auto" }}>
        {messages.length === 0 && (
          <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>
            {monsterName}に話しかけてみましょう。
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              background: m.role === "user" ? "var(--accent-strong)" : "var(--bg)",
              color: m.role === "user" ? "#fff" : "var(--ink)",
              borderRadius: "var(--radius-md)",
              padding: "8px 12px",
              fontSize: 14,
              fontWeight: 700,
              maxWidth: "80%",
            }}
          >
            {m.text}
          </div>
        ))}
        {error && (
          <div style={{ fontSize: 12, color: "var(--ink-soft)", fontStyle: "italic" }}>{error}</div>
        )}
      </div>
      <form onSubmit={handleSend} style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="メッセージを送る"
          disabled={loading}
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
          disabled={loading}
          style={{
            border: "none",
            background: "var(--sky)",
            color: "#fff",
            fontWeight: 800,
            borderRadius: "var(--radius-md)",
            padding: "0 18px",
            cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "…" : "送信"}
        </button>
      </form>
    </div>
  );
}
