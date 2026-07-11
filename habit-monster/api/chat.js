// Vercelサーバーレス関数。ANTHROPIC_API_KEYはここ(サーバー側)にのみ保持する。
// HANDOFF.md 論点#2の実装。TODO: 本番運用時はIP単位のレート制限をKV/Upstash等の
// 永続ストアに置き換えること(下記はインスタンス生存中のみ有効なベストエフォート実装)。

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const requestLog = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const timestamps = (requestLog.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  timestamps.push(now);
  requestLog.set(ip, timestamps);
  return timestamps.length > RATE_LIMIT_MAX_REQUESTS;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }

  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
  if (isRateLimited(ip)) {
    res.status(429).json({ error: "too many requests" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "chat backend is not configured" });
    return;
  }

  const { monster, history, message } = req.body ?? {};
  if (typeof message !== "string" || !message.trim()) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  const monsterName = monster?.name ?? "モンスター";
  const stageName = monster?.stage ?? "たまご";
  const level = monster?.level ?? 1;

  const messages = [
    ...(Array.isArray(history) ? history : []).slice(-10).map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: String(m.text ?? ""),
    })),
    { role: "user", content: message },
  ];

  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        system: `あなたは習慣化育成ゲームに登場するモンスター「${monsterName}」(進化段階: ${stageName}、Lv.${level})です。ユーザーの習慣づけを励ます、優しく短い口調で1〜2文程度で返答してください。`,
        messages,
      }),
    });

    if (!anthropicRes.ok) {
      const detail = await anthropicRes.text();
      console.error("habit-monster: anthropic api error", anthropicRes.status, detail);
      res.status(502).json({ error: "upstream chat error" });
      return;
    }

    const data = await anthropicRes.json();
    const reply = data.content?.[0]?.text ?? "…";
    res.status(200).json({ reply });
  } catch (err) {
    console.error("habit-monster: chat handler failed", err);
    res.status(500).json({ error: "internal error" });
  }
}
