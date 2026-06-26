#!/usr/bin/env python3
"""本日の経済ニュースをもとに、LLM が推奨しそうな株式銘柄（日本株・米国株）を
理由とともに生成し、日記サイト用の JSON データに追記するスクリプト。

- シークレットはコードに一切含めない。Claude API キーは環境変数
  ANTHROPIC_API_KEY（GitHub Secrets / Azure Key Vault 等から注入）から読み込む。
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

API_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_VERSION = "2023-06-01"

# 既定モデル（環境変数 STOCK_DIARY_MODEL で上書き可能）
DEFAULT_MODEL = "claude-sonnet-4-6"

JST = timezone(timedelta(hours=9))

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "stock-diary" / "data" / "entries.json"

# 1ファイルが肥大化しないよう、保持する最大エントリ数
MAX_ENTRIES = 400


def build_prompt(date_str: str) -> str:
    return f"""あなたは経済・金融に詳しいアナリストです。本日は {date_str}（日本時間）です。

# タスク
1. まず web 検索を使い、本日（{date_str}）前後の「日本経済」「米国経済」「株式市場」に関する
   主要な経済ニュースを調べてください。
2. その経済ニュースの内容を踏まえ、あなた自身の知識で「今、推奨しそうな株式銘柄」を
   日本株から3銘柄、米国株から3銘柄、それぞれ選んでください。
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
- reason は当日のニュースの文脈を反映させ、一般論で終わらせないでください。
- これは投資助言ではなく、LLM の知識に基づく記録です。断定を避け、リスクにも触れてください。
"""


def call_claude(prompt: str, model: str, use_web_search: bool) -> str:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise SystemExit(
            "ERROR: 環境変数 ANTHROPIC_API_KEY が設定されていません。"
            "GitHub Secrets 等から注入してください。"
        )

    body = {
        "model": model,
        "max_tokens": 4096,
        "messages": [{"role": "user", "content": prompt}],
    }
    if use_web_search:
        body["tools"] = [
            {"type": "web_search_20250305", "name": "web_search", "max_uses": 5}
        ]

    req = urllib.request.Request(
        API_URL,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "content-type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": ANTHROPIC_VERSION,
        },
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=180) as resp:
        payload = json.loads(resp.read().decode("utf-8"))

    # text ブロックを連結して返す（web_search のサーバ側ツールは自動実行される）
    texts = [
        block.get("text", "")
        for block in payload.get("content", [])
        if block.get("type") == "text"
    ]
    return "\n".join(t for t in texts if t).strip()


def extract_json(text: str) -> dict:
    """応答テキストから JSON オブジェクトを抽出する。"""
    # ```json ... ``` フェンスを優先
    fence = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    candidate = fence.group(1) if fence else None
    if candidate is None:
        # 最初の { から最後の } まで
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


def main() -> int:
    model = os.environ.get("STOCK_DIARY_MODEL", DEFAULT_MODEL)
    use_web_search = os.environ.get("STOCK_DIARY_WEB_SEARCH", "true").lower() != "false"

    now = datetime.now(JST)
    date_str = now.strftime("%Y-%m-%d")
    prompt = build_prompt(date_str)

    print(f"[stock-diary] date={date_str} model={model} web_search={use_web_search}")

    try:
        text = call_claude(prompt, model, use_web_search)
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")
        print(f"[stock-diary] HTTPError {e.code}: {detail}", file=sys.stderr)
        if use_web_search:
            print("[stock-diary] web 検索なしで再試行します。", file=sys.stderr)
            text = call_claude(prompt, model, use_web_search=False)
            use_web_search = False
        else:
            raise

    data = extract_json(text)

    entry = {
        "date": date_str,
        "generated_at": now.isoformat(),
        "model": model,
        "web_search": use_web_search,
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
        f"[stock-diary] 書き込み完了: {DATA_FILE} "
        f"(japan={len(entry['japan'])}, us={len(entry['us'])}, total_entries={len(entries)})"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
