// Vercelサーバーレス関数。APIキーはここ(サーバー側)にのみ保持する。
// HANDOFF.md 論点#2の実装。TODO: 本番運用時はIP単位のレート制限をKV/Upstash等の
// 永続ストアに置き換えること(下記はインスタンス生存中のみ有効なベストエフォート実装)。
//
// プロバイダは stock-diary/scripts/generate_stock_diary.py と同じ考え方:
// 1) ANTHROPIC_API_KEY があれば Anthropic を優先
// 2) なければ GitHub Models にフォールバック(GITHUB_TOKEN で認証。models:read権限のPATが必要。
//    GitHub Actions内のGITHUB_TOKENと違い、Vercel等では自動発行されないため自分でPATを発行して
//    環境変数に設定すること)
// GitHub Modelsは無料だがアカウントプランに応じたレート制限があり、大量トラフィックの本番用途には
// 非推奨(GitHub公式もAzure AI Foundryへの移行を案内している)。個人利用のプロトタイプ用途を想定。

const GITHUB_MODELS_URL = "https://models.github.ai/inference/chat/completions";
const GITHUB_MODEL = process.env.HABIT_MONSTER_GH_MODEL || "openai/gpt-4o-mini";

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

function buildSystemPrompt(monsterName, stageName, level) {
  return `あなたは習慣化育成ゲームに登場するモンスター「${monsterName}」(進化段階: ${stageName}、Lv.${level})です。ユーザーの習慣づけを励ます、優しく短い口調で1〜2文程度で返答してください。`;
}

// Anthropic Messages APIはuser/assistantの厳密な交互反復を要求する。
// クライアント側でリクエストが失敗すると応答なしのuserターンが残り、次送信時に
// user,userが連続してしまうことがあるため、同role連続分を結合して防御する。
function toAlternatingRoles(messages) {
  const merged = [];
  for (const msg of messages) {
    const last = merged[merged.length - 1];
    if (last && last.role === msg.role) {
      last.content += `\n${msg.content}`;
    } else {
      merged.push({ role: msg.role, content: msg.content });
    }
  }
  return merged;
}

async function callAnthropic(apiKey, system, messages) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      system,
      messages: toAlternatingRoles(messages),
    }),
  });
  if (!res.ok) {
    throw new Error(`anthropic api returned ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text ?? "…";
}

async function callGithubModels(token, system, messages) {
  const res = await fetch(GITHUB_MODELS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      model: GITHUB_MODEL,
      max_tokens: 200,
      temperature: 0.7,
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });
  if (!res.ok) {
    throw new Error(`github models api returned ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "…";
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

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!anthropicKey && !githubToken) {
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
  const system = buildSystemPrompt(monsterName, stageName, level);

  const messages = [
    ...(Array.isArray(history) ? history : []).slice(-10).map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: String(m.text ?? ""),
    })),
    { role: "user", content: message },
  ];

  try {
    let reply;
    if (anthropicKey) {
      try {
        reply = await callAnthropic(anthropicKey, system, messages);
      } catch (err) {
        console.error("habit-monster: anthropic call failed, falling back", err);
        if (!githubToken) throw err;
        reply = await callGithubModels(githubToken, system, messages);
      }
    } else {
      reply = await callGithubModels(githubToken, system, messages);
    }
    res.status(200).json({ reply });
  } catch (err) {
    console.error("habit-monster: chat handler failed", err);
    res.status(502).json({ error: "upstream chat error" });
  }
}
