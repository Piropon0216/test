# Habit Monster

習慣を記録するとモンスターが育っていく、習慣化トラッキング × 育成ゲームのReact SPAです。

🔗 **[今すぐ遊ぶ → https://piropon0216.github.io/test/habit-monster/site/](https://piropon0216.github.io/test/habit-monster/site/)**
(GitHub Pagesでの静的公開。習慣トラッキング・育成機能はフル動作します。
おしゃべり機能はバックエンド未設定のため「いまはお話しできないみたい…」表示になります)

## 遊び方

1. 「新しい習慣を追加」で習慣を登録する。頻度は毎日/週5回/週3回/週1回から選べる
2. 達成した習慣にチェックを入れる(+10XP)。週N回の習慣は、その週の目標回数に達すると
   それ以降その週はチェックしなくても「達成済み」扱いになる
3. その日の全習慣(週N回habitは週の目標達成済みも含む)が達成状態だとボーナスXP(+5XP)
4. XPが貯まるとレベルが上がり、モンスターが進化する(たまご→ベビー→こども→少年期→成体→伝説)
5. 習慣を毎日続けると連続日数(🔥ストリーク)が伸びる。7日連続ごとに🧊ストリークフリーズを1個獲得
   (最大3個保持)。ちょうど1日だけサボってもフリーズを1個消費してストリークが途切れない
   (2日以上抜けると通常通りリセット)

進化段階やXP量、ストリークフリーズの獲得間隔・上限、頻度の選択肢は `src/constants.js`、
レベル・週次判定などの計算は `src/utils.js` で調整できます。

## セットアップ

```bash
npm install
npm run dev         # 開発サーバー
npm run build       # 本番ビルド(dist/に出力。gitignore対象)
npm run preview     # ビルド結果をローカル確認
npm test            # ゲームロジックのユニットテスト(vitest)
npm run build:pages # GitHub Pages公開用ビルド(site/に出力。コミット対象)
```

`site/`は上記GitHub Pagesリンクとして実際にコミットされているビルド成果物です。
`kuromi_game.html`や`stock-diary/index.html`と同様、このリポジトリはビルドステップなしで
mainブランチのルートをそのまま配信する設定のため、公開用ファイルは都度ビルドしてコミットする
運用にしています。ソースを変更したら`npm run build:pages`を再実行して`site/`を更新してください。

## データの保存

`src/storage.js` が永続化を抽象化しています。Claude.aiアーティファクト環境では
`window.storage` を、それ以外の通常のブラウザでは `localStorage` を使います。
現状は端末ローカルの保存のみです(複数端末同期には未対応)。

## おしゃべり機能(ChatPanel)について

モンスターに話しかけるチャット機能は、`api/chat.js`(Vercelサーバーレス関数)経由でLLMを呼びます。
`stock-diary/`と同じ考え方で、プロバイダは2段階のフォールバックです。

1. 環境変数 `ANTHROPIC_API_KEY` があればAnthropicを優先使用
2. なければ `GITHUB_TOKEN`(`models: read`権限のPersonal Access Token)でGitHub Modelsにフォールバック
   (無料だがアカウントプランに応じたレート制限あり。GitHub Actions内の自動発行`GITHUB_TOKEN`と違い、
   Vercel等では自分でPATを発行して環境変数に設定する必要がある)

どちらも未設定の環境(例: GitHub Pagesなど静的ホスティングのみの環境)では、
チャット機能は「いまはお話しできないみたい…」という表示にフォールバックし、
それ以外の習慣トラッキング・育成機能には影響しません。

**⚠️ このリポジトリはパブリックです。** `ANTHROPIC_API_KEY` / `GITHUB_TOKEN` などのトークンは
絶対にコード・コミット・`.env`ファイルにベタ書きしてコミットしないこと。必ずVercelなど
デプロイ先のプラットフォームの環境変数/シークレット管理機能から設定してください
(`.gitignore`で`.env`系は既に除外済みですが、念のため`git status`で意図せず含まれていないか確認を)。

## 詳細・引き継ぎ事項

元になった設計判断やTODOは [`HANDOFF.md`](./HANDOFF.md) を参照してください。
