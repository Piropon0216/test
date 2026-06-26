# LLM 株式銘柄 日記 📈

本日の経済ニュースをもとに、LLM（大規模言語モデル）が推奨しそうな
**日本株・米国株**を理由とともに、毎営業日（月〜金 朝8時 JST）に自動記録する日記サイトです。

🔗 公開URL（GitHub Pages）: `https://piropon0216.github.io/test/stock-diary/`

> ⚠️ **免責事項**: 本サイトの内容は LLM の知識・推測に基づく「日記」であり、投資助言ではありません。
> 投資判断はご自身の責任で行ってください。

---

## 仕組み

| 要素 | 内容 |
| --- | --- |
| サイト | `stock-diary/index.html`（静的ページ。`data/entries.json` を読み込んで表示） |
| データ | `stock-diary/data/entries.json`（新しい順のエントリ配列） |
| 生成スクリプト | `scripts/generate_stock_diary.py`（LLM を呼び出して銘柄を生成） |
| 自動実行 | `.github/workflows/update-stock-diary.yml`（cron `0 23 * * 0-4` = **月〜金 08:00 JST**） |

### LLM プロバイダ（2系統・自動フォールバック）

既定（`STOCK_DIARY_PROVIDER=auto`）では次の順に試します。

1. **Anthropic Claude API** … `ANTHROPIC_API_KEY` が必要。**web検索で当日の経済ニュースを参照**でき精度が高い。
2. **GitHub Models**（フォールバック）… `GITHUB_TOKEN`（Actions が自動発行）で認証するため
   **保存する外部APIキーが不要**。web検索は使わず、LLM の知識ベースで生成。

Anthropic が**未設定または失敗**した場合は自動的に GitHub Models にフォールバックし、
その事実をエントリに記録（`fallback: true` / `fallback_reason`）、**サイト上にも「⚠ フォールバック」と明示**されます。

> つまり `ANTHROPIC_API_KEY` を登録しなくても、**外部キーゼロのまま GitHub Models だけで動かせます**。
> Anthropic キーを登録すれば、通常時はそちらが使われ、障害時のみ GitHub Models に退避します。

`STOCK_DIARY_PROVIDER` は `auto`（既定）/ `anthropic`（固定・フォールバックしない）/ `github`（GitHub Models 固定）から選べます。

GitHub Actions の cron は UTC のため、`08:00 JST = 前日 23:00 UTC`。
よって UTC では日曜〜木曜 (0-4) の 23:00 を指定し、結果として **JST 月〜金 08:00** に1日1回実行されます。

---

## セットアップ

### 1.（任意）Anthropic API キーを GitHub Secrets に登録する

> **登録しなくても動きます**（その場合は GitHub Models で生成し、サイトに「フォールバック」と表示）。
> web検索つきの高精度生成を使いたい場合のみ登録してください。シークレットはコードに一切書きません。

リポジトリの **Settings → Secrets and variables → Actions → New repository secret** で登録します。

- Name: `ANTHROPIC_API_KEY`
- Value: Claude API のキー（`sk-ant-...`）

> パブリックリポジトリでも Secrets は暗号化保存され、ログ上は自動マスク、フォークPRからはアクセス不可です。
> Azure Key Vault を使う場合は、ワークフローに `azure/login` + `az keyvault secret show` を追加し、
> 取得した値を `ANTHROPIC_API_KEY` 環境変数に渡すように差し替えてください（キー本体は Key Vault 側にのみ保管）。

GitHub Models へのフォールバックには登録不要です（`GITHUB_TOKEN` を Actions が自動発行し、
ワークフローの `permissions: models: read` で利用します）。

### 2. （任意）プロバイダ・モデルの設定

**Settings → Secrets and variables → Actions → Variables** で上書きできます。

- `STOCK_DIARY_PROVIDER`（既定: `auto` / `anthropic` / `github`）
- `STOCK_DIARY_MODEL`（Anthropic 用。既定: `claude-sonnet-4-6`）
- `STOCK_DIARY_GH_MODEL`（GitHub Models 用。既定: `openai/gpt-4o-mini`）
- `STOCK_DIARY_WEB_SEARCH`（Anthropic 時。既定: `true` / `false` で無効化）

### 3. スケジュール実行を有効にする（重要）

GitHub Actions の**スケジュール実行はデフォルトブランチ（`main`）上のワークフローのみ**発火します。
定期更新を有効にするには、このワークフロー（`.github/workflows/update-stock-diary.yml`）を
**`main` にマージ**してください。

### 4. GitHub Pages を有効にする

**Settings → Pages** で `main` ブランチのルートを公開対象にしてください
（このリポジトリは既に Pages を利用しています）。

---

## 手動で実行する（テスト）

- GitHub 上: **Actions → Update Stock Diary → Run workflow**（`workflow_dispatch`）
- ローカル:

  ```bash
  # Anthropic を使う場合（任意）。未設定なら GitHub Models にフォールバック
  export ANTHROPIC_API_KEY=sk-ant-...   # シェルにのみ設定。コミットしないこと
  # GitHub Models を使う場合（フォールバック先）
  export GITHUB_TOKEN=ghp_...           # models:read 権限のあるトークン
  python scripts/generate_stock_diary.py
  ```

  実行すると `stock-diary/data/entries.json` の先頭に当日のエントリが追記されます。

---

## データ形式（`data/entries.json`）

新しい順のエントリ配列。各エントリは以下の構造です。

```json
{
  "date": "2026-06-26",
  "generated_at": "2026-06-26T08:00:00+09:00",
  "provider": "anthropic",
  "model": "claude-sonnet-4-6",
  "web_search": true,
  "fallback": false,
  "fallback_reason": "",
  "market_summary": "本日の相場概況…",
  "japan": [{ "ticker": "7203", "name": "トヨタ自動車", "sector": "自動車", "reason": "…" }],
  "us": [{ "ticker": "NVDA", "name": "NVIDIA", "sector": "半導体", "reason": "…" }],
  "disclaimer": "…"
}
```
