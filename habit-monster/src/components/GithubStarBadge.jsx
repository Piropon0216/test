import { useEffect, useState } from "react";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5分 stale-while-revalidate

function cacheKey(owner, repo) {
  return `habit-monster:stars:${owner}/${repo}`;
}

function readCache(owner, repo) {
  try {
    const raw = sessionStorage.getItem(cacheKey(owner, repo));
    if (!raw) return null;
    const { stars, cachedAt } = JSON.parse(raw);
    return { stars, stale: Date.now() - cachedAt > CACHE_TTL_MS };
  } catch {
    return null;
  }
}

function writeCache(owner, repo, stars) {
  try {
    sessionStorage.setItem(
      cacheKey(owner, repo),
      JSON.stringify({ stars, cachedAt: Date.now() })
    );
  } catch {
    // sessionStorage 不可(プライベートモード等)は無視して劣化させる
  }
}

export default function GithubStarBadge({ owner, repo }) {
  const [stars, setStars] = useState(() => readCache(owner, repo)?.stars ?? null);

  useEffect(() => {
    const cached = readCache(owner, repo);
    if (cached && !cached.stale) return;

    let cancelled = false;
    fetch(`https://api.github.com/repos/${owner}/${repo}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setStars(data.stargazers_count);
        writeCache(owner, repo, data.stargazers_count);
      })
      .catch(() => {
        // 未認証APIのレート制限等。表示は静かに諦める。
      });

    return () => {
      cancelled = true;
    };
  }, [owner, repo]);

  return (
    <a
      href={`https://github.com/${owner}/${repo}`}
      target="_blank"
      rel="noreferrer"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 13,
        fontWeight: 700,
        color: "var(--ink-soft)",
        textDecoration: "none",
        background: "var(--accent-soft)",
        padding: "4px 10px",
        borderRadius: 999,
      }}
    >
      ⭐ {stars ?? "–"}
    </a>
  );
}
