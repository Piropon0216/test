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
| 生成スクリプト | `scripts/generate_stock_diary.py`（Claude API を呼び出し、web検索で当日の経済ニュースを参照して銘柄を生成） |
| 自動実行 | `.github/workflows/update-stock-diary.yml`（cron `0 23 * * 0-4` = **月〜金 08:00 JST**） |

GitHub Actions の cron は UTC のため、`08:00 JST = 前日 23:00 UTC`。
よって UTC では日曜〜木曜 (0-4) の 23:00 を指定し、結果として **JST 月〜金 08:00** に1日1回実行されます。

---

## セットアップ（必須）

### 1. API キーを GitHub Secrets に登録する（コードには一切書きません）

リポジトリの **Settings → Secrets and variables → Actions → New repository secret** で以下を登録します。

- Name: `ANTHROPIC_API_KEY`
- Value: Claude API のキー（`sk-ant-...`）

> シークレットはコードに含めず、GitHub Secrets から環境変数として注入します。
> Azure Key Vault を使う場合は、ワークフローに `azure/login` + `azure/get-keyvault-secrets`
> （または `az keyvault secret show`）を追加し、取得した値を `ANTHROPIC_API_KEY` 環境変数に
> 渡すように差し替えてください（キー本体は Key Vault 側にのみ保管）。

### 2. （任意）モデルや web 検索の設定

**Settings → Secrets and variables → Actions → Variables** で上書きできます。

- `STOCK_DIARY_MODEL`（既定: `claude-sonnet-4-6`）
- `STOCK_DIARY_WEB_SEARCH`（既定: `true` / `false` で無効化）

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
  export ANTHROPIC_API_KEY=sk-ant-...   # シェルにのみ設定。コミットしないこと
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
  "model": "claude-sonnet-4-6",
  "web_search": true,
  "market_summary": "本日の相場概況…",
  "japan": [{ "ticker": "7203", "name": "トヨタ自動車", "sector": "自動車", "reason": "…" }],
  "us": [{ "ticker": "NVDA", "name": "NVIDIA", "sector": "半導体", "reason": "…" }],
  "disclaimer": "…"
}
```
