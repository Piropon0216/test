# test — GitHub Pages サイト集

このリポジトリは GitHub Pages（`https://piropon0216.github.io/test/`）で公開している
ページの集まりです。

## 📈 LLM 株式銘柄 日記（自動更新）

本日の経済ニュースをもとに、LLM が推奨しそうな**日本株・米国株**を理由つきで、
毎営業日（**月〜金 朝8時 JST**）に自動記録する日記サイトです。

🔗 **[日記を見る → https://piropon0216.github.io/test/stock-diary/](https://piropon0216.github.io/test/stock-diary/)**

- 生成は GitHub Actions（`.github/workflows/update-stock-diary.yml`）で自動実行
- LLM は **Anthropic Claude API** を優先し、未設定/失敗時は **GitHub Models**（外部APIキー不要）に自動フォールバック
- セットアップ手順は [`stock-diary/README.md`](stock-diary/README.md) を参照

> ⚠️ 本日記は LLM の知識・推測に基づく記録であり、投資助言ではありません。

<!-- STOCK-DIARY:START -->
<!-- このブロックは scripts/generate_stock_diary.py が自動更新します（手で編集しないでください）。 -->
<!-- STOCK-DIARY:END -->

## その他のページ

| ページ | 内容 |
| --- | --- |
| [`index.html`](index.html) | MINIMAL SHOP（サイトトップ） |
| [`kuromi_game.html`](kuromi_game.html) | クロミちゃんテーマのパズルゲーム |
| [`stock-diary/`](stock-diary/) | LLM 株式銘柄 日記（上記） |
