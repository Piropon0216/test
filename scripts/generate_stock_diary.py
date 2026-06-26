#!/usr/bin/env python3
"""本日の経済ニュースをもとに、LLM が推奨しそうな株式銘柄（日本株・米国株）を
理由とともに生成し、日記サイト用の JSON データに追記するスクリプト。

プロバイダは2系統に対応し、既定では次の順で試す（auto）:
  1) Anthropic Claude API   … ANTHROPIC_API_KEY が必要。web検索で当日ニュース参照。
  2) GitHub Models          … GITHUB_TOKEN（Actions が自動発行）で認証。外部キー不要。

Anthropic が使えない／失敗した場合は GitHub Models に自動フォールバックし、
フォールバックした事実をエントリ（fallback / fallback_reason）に記録する。

- シークレットはコードに一切含めない。すべて環境変数から読み込む。
- 標準ライブラリ（urllib）のみを使用し、追加依存を持たない。
- これは投資助言ではなく、LLM の知識・推測に基づく記録（日記）です。
"""

from __future__ import annotations

import json
import os
import re
import sys
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

# --- Anthropic ---
ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_VERSION = "2023-06-01"
DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-6"

# --- GitHub Models（OpenAI 互換エンドポイント）---
GITHUB_MODELS_URL = "https://models.github.ai/inference/chat/completions"
DEFAULT_GITHUB_MODEL = "openai/gpt-4o-mini"

JST = timezone(timedelta(hours=9))

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "stock-diary" / "data" / "entries.json"

# 1ファイルが肥大化しないよう、保持する最大エントリ数
MAX_ENTRIES = 400


def build_prompt(date_str: str, web_search: bool) -> str:
    if web_search:
        step1 = (
            "1. まず web 検索を使い、本日（{d}）前後の「日本経済」「米国経済」「株式市場」"
            "に関する主要な経済ニュースを調べてください。"
        ).format(d=date_str)
        context = "その経済ニュースの内容を踏まえ、あなた自身の知識で"
    else:
        step1 = (
            "1. 本日（{d}）時点で想定される経済環境・最近の経済ニュースの潮流を、"
            "あなた自身の知識から整理してください。"
        ).format(d=date_str)
        context = "その経済環境の整理を踏まえ、あなた自身の知識で"

    return f"""あなたは経済・金融に詳しいアナリストです。本日は {date_str}（日本時間）です。

# タスク
{step1}
2. {context}「今、推奨しそうな株式銘柄」を、日本株から3銘柄、米国株から3銘柄、
   それぞれ選んでください。
3. それぞれについて、なぜ推奨するのかの理由を、当日のニュースや背景と結び付けて
   日本語で具体的に説明してください。

# 出力形式（厳守）
余計な前置きや後書きを書かず、次の JSON だけを出力してください。
```json
{{
  "market_summary": "本日の経済ニュース・相場概況を3〜5文の日本語で要約",
  "japan": [
    {{"ticker": "証券コード（例: 7203）", "name": "銘柄名", "sector": "業種", "reason": "推奨理由（具体的に2〜4文）"}}
  ],
  "us": [
    {{"ticker": "ティッカー（例: NVDA）", "name": "銘柄名", "sector": "業種", "reason": "推奨理由（具体的に2〜4文）"}}
  ]
}}
```

# 注意
- japan は3件、us は3件にしてください。
- reason は経済環境の文脈を反映させ、一般論で終わらせないでください。
- これは投資助言ではなく、LLM の知識に基づく記録です。断定を避け、リスクにも触れてください。
"""


def _post_json(url: str, body: dict, headers: dict, timeout: int = 180) -> dict:
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={**headers, "content-type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def call_anthropic(prompt_with: str, prompt_without: str, model: str) -> tuple[str, bool]:
    """Anthropic で生成。戻り値は (text, web_search_used)。

    最初は web 検索ありで試し、ツール関連の HTTP エラーなら web 検索なしで再試行する。
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY が未設定です。")

    headers = {"x-api-key": api_key, "anthropic-version": ANTHROPIC_VERSION}

    def _request(use_web_search: bool) -> str:
        body = {
            "model": model,
            "max_tokens": 4096,
            "messages": [
                {"role": "user", "content": prompt_with if use_web_search else prompt_without}
            ],
        }
        if use_web_search:
            body["tools"] = [
                {"type": "web_search_20250305", "name": "web_search", "max_uses": 5}
            ]
        payload = _post_json(ANTHROPIC_URL, body, headers)
        texts = [
            b.get("text", "")
            for b in payload.get("content", [])
            if b.get("type") == "text"
        ]
        return "\n".join(t for t in texts if t).strip()

    try:
        return _request(use_web_search=True), True
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")
        print(f"[anthropic] web検索ありで失敗 {e.code}: {detail}", file=sys.stderr)
        # web 検索なしで再試行（ここで失敗したら例外は呼び出し側へ）
        return _request(use_web_search=False), False


def call_github_models(prompt: str, model: str) -> str:
    """GitHub Models（OpenAI 互換）で生成。GITHUB_TOKEN で認証する。"""
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if not token:
        raise RuntimeError("GITHUB_TOKEN が未設定です。")

    body = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 4096,
        "temperature": 0.7,
    }
    headers = {"Authorization": f"Bearer {token}"}
    payload = _post_json(GITHUB_MODELS_URL, body, headers)
    return (payload["choices"][0]["message"]["content"] or "").strip()


def extract_json(text: str) -> dict:
    """応答テキストから JSON オブジェクトを抽出する。"""
    fence = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    candidate = fence.group(1) if fence else None
    if candidate is None:
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            candidate = text[start : end + 1]
    if candidate is None:
        raise ValueError("応答から JSON を抽出できませんでした:\n" + text[:1000])
    return json.loads(candidate)


def normalize_picks(items, kind: str) -> list:
    out = []
    for it in items or []:
        if not isinstance(it, dict):
            continue
        out.append(
            {
                "ticker": str(it.get("ticker", "")).strip(),
                "name": str(it.get("name", "")).strip(),
                "sector": str(it.get("sector", "")).strip(),
                "reason": str(it.get("reason", "")).strip(),
            }
        )
    if not out:
        raise ValueError(f"{kind} の銘柄が空でした。")
    return out


def load_entries() -> list:
    if DATA_FILE.exists():
        try:
            data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
            if isinstance(data, list):
                return data
        except (json.JSONDecodeError, OSError):
            pass
    return []


def generate(date_str: str) -> dict:
    """プロバイダを選択して生成し、メタ情報込みの結果 dict を返す。"""
    provider_pref = os.environ.get("STOCK_DIARY_PROVIDER", "auto").lower()
    anthropic_model = os.environ.get("STOCK_DIARY_MODEL", DEFAULT_ANTHROPIC_MODEL)
    github_model = os.environ.get("STOCK_DIARY_GH_MODEL", DEFAULT_GITHUB_MODEL)
    allow_web_search = os.environ.get("STOCK_DIARY_WEB_SEARCH", "true").lower() != "false"

    prompt_web = build_prompt(date_str, web_search=allow_web_search)
    prompt_noweb = build_prompt(date_str, web_search=False)

    fallback = False
    fallback_reason = ""

    # --- 1) Anthropic を優先（auto / anthropic）---
    if provider_pref in ("auto", "anthropic"):
        try:
            text, web_used = call_anthropic(prompt_web, prompt_noweb, anthropic_model)
            data = extract_json(text)
            return {
                "provider": "anthropic",
                "model": anthropic_model,
                "web_search": web_used,
                "fallback": False,
                "fallback_reason": "",
                "data": data,
            }
        except Exception as e:  # noqa: BLE001 - どんな失敗でも GitHub Models へ退避
            reason = f"{type(e).__name__}: {e}"
            print(f"[provider] Anthropic 失敗 → フォールバック検討: {reason}", file=sys.stderr)
            if provider_pref == "anthropic":
                # 明示的に anthropic 指定ならフォールバックしない
                raise
            fallback = True
            fallback_reason = reason[:300]

    # --- 2) GitHub Models（auto のフォールバック、または github 明示）---
    text = call_github_models(prompt_noweb, github_model)
    data = extract_json(text)
    if fallback:
        print(
            f"[provider] GitHub Models にフォールバックしました（model={github_model}）。",
            file=sys.stderr,
        )
    return {
        "provider": "github-models",
        "model": github_model,
        "web_search": False,
        "fallback": fallback,
        "fallback_reason": fallback_reason,
        "data": data,
    }


def main() -> int:
    now = datetime.now(JST)
    date_str = now.strftime("%Y-%m-%d")
    print(f"[stock-diary] date={date_str} provider_pref={os.environ.get('STOCK_DIARY_PROVIDER', 'auto')}")

    result = generate(date_str)
    data = result["data"]

    entry = {
        "date": date_str,
        "generated_at": now.isoformat(),
        "provider": result["provider"],
        "model": result["model"],
        "web_search": result["web_search"],
        "fallback": result["fallback"],
        "fallback_reason": result["fallback_reason"],
        "market_summary": str(data.get("market_summary", "")).strip(),
        "japan": normalize_picks(data.get("japan"), "japan"),
        "us": normalize_picks(data.get("us"), "us"),
        "disclaimer": (
            "本記録は LLM（大規模言語モデル）の知識・推測に基づく日記であり、"
            "投資助言ではありません。投資は自己責任で行ってください。"
        ),
    }

    entries = [e for e in load_entries() if e.get("date") != date_str and not e.get("sample")]
    entries.insert(0, entry)
    entries = entries[:MAX_ENTRIES]

    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    DATA_FILE.write_text(
        json.dumps(entries, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(
        f"[stock-diary] 書き込み完了: provider={entry['provider']} "
        f"fallback={entry['fallback']} japan={len(entry['japan'])} us={len(entry['us'])} "
        f"total={len(entries)}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
