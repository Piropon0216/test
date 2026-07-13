# Claude Code ハンドオフ — habit-monster

## 概要
習慣トラッキング × モンスター育成ゲームのReact SPA。Claude.aiのアーティファクトとして
プロトタイピングし、このリポジトリに移植した。UIとゲームロジックは完成しているが、
アーティファクト環境固有の機能に依存している箇所が2つあり、単体デプロイ前に対応が必要。

## アーキテクチャ判断ポイント(要検討)

### 1. データ永続化 — `src/storage.js`
- 現状: `window.storage`(Claude.aiアーティファクト専用API)があれば使い、なければ
  `localStorage`にフォールバックする抽象化レイヤーを実装済み。
- 論点: `localStorage`はブラウザ単位でしか永続化されない。複数端末で同じ記録を見たい
  という要件が出た場合は、認証+バックエンドDB(例: Supabase, PlanetScale等)への
  置き換えが必要。現時点ではその要件は未確認。

### 2. 会話機能のバックエンド — `api/chat.js`
- 現状: `src/components/ChatPanel.jsx`は環境を検知し、アーティファクト内では
  `window.claude.complete`、それ以外では `/api/chat` を叩く設計。
- 実装済み: `api/chat.js`はVercelサーバーレス関数として実装済み。`ANTHROPIC_API_KEY`が
  あればAnthropicを優先、なければ`GITHUB_TOKEN`(`models: read`権限PAT)でGitHub Models
  にフォールバックする(`stock-diary`と同じ二段構え)。IP単位の簡易レート制限も実装済み
  (インスタンス生存中のみ有効なベストエフォート。本番運用ではKV/Upstash等の永続ストアへの
  置き換えが必要)。どちらの鍵も未設定ならチャットは静かにフォールバック表示になる。
- 残TODO: サーバーレス関数(`api/chat.js`)自体はVercel等へのデプロイと環境変数設定が
  未着手。現在GitHub Pagesで公開しているビルド(下記)にはこのAPIルートは存在しないため、
  チャット機能は静的公開時点では常にフォールバック表示になる。

### 3. GitHub ★バッジ — `src/components/GithubStarBadge.jsx`
- 公開API `api.github.com/repos/{owner}/{repo}` を認証なしで叩いているだけ(読み取り専用)。
- 実装済み: 未認証GitHub APIのIPベース60req/hour制限対策として、`sessionStorage`に
  5分stale-while-revalidateのキャッシュを実装済み。
- 実際に★を「付け外し」する機能は要件から除外済み(表示+リンクのみ)。

### 4. 継続維持ロジック — `src/utils.js` / `App.jsx`
- ストリークフリーズ: `STREAK_FREEZE_INTERVAL`(7)日連続ごとに1個獲得、`MAX_STREAK_FREEZES`(3)まで
  保持。ちょうど1日だけ抜けた場合(`daysBetween`が2)にフリーズを消費してストリークを継続する。
  2日以上抜けると通常通りリセット。`App.jsx`の`toggleHabit`内で完結しており、取り消し(アンチェック)
  時のロールバック(`freezesBeforeToday`)も実装済み。
- 週次頻度: 習慣ごとに`targetDaysPerWeek`(7=毎日、それ未満は週N回)を持つ。`isHabitSatisfiedOn`が
  「その日にやったか、週の目標に既に達しているか」を判定し、ボーナスXP判定(`allHabitsDoneOn`)や
  `HabitLog`の週間進捗表示に使われる。既存データ(フィールド無し)は`?? DEFAULT_TARGET_DAYS_PER_WEEK`
  で毎日扱いにフォールバックするため後方互換。
- Google OIDCでの認証は技術的に可能(Google Identity Services + サーバー側でのIDトークン検証)だが、
  静的ホスティングだけでは完結せず#1のバックエンドDBとセットでの検討が必要。要件未確認のため未着手。

## ディレクトリ構成
```
src/
  main.jsx          エントリポイント
  App.jsx           状態管理・ゲームロジック
  storage.js         永続化の抽象化(#1)
  constants.js       進化段階・XP定数
  utils.js            日付/レベル計算ユーティリティ
  components/
    Shell.jsx          フォント・グローバルCSS
    Header.jsx          ヘッダー(モンスター名・Lv・★バッジ)
    GithubStarBadge.jsx  ★バッジ(#3)
    SectionLabel.jsx     セクション見出し
    MonsterCard.jsx      モンスター表示・成長リング
    HabitLog.jsx          習慣チェックリスト
    AddHabitForm.jsx      習慣追加フォーム
    ChatPanel.jsx          会話UI(#2)
  utils.test.js       ゲームロジックのユニットテスト(vitest)
api/
  chat.js             会話バックエンド(Anthropic優先 → GitHub Modelsフォールバック)
```

## 未実装 / TODO
- [x] `api/chat.js` の実装(Anthropic / GitHub Models フォールバック) — サーバーレス関数自体のデプロイは未着手
- [x] GitHub ★バッジのレート制限対策(5分キャッシュ実装済み)
- [x] ユニットテスト(`src/utils.js`、`npm test`で実行。vitest導入済み)
- [x] GitHub Pagesでの静的公開(`npm run build:pages` → `site/` をコミット。
      https://piropon0216.github.io/test/habit-monster/site/ )。チャットのバックエンドは含まない
- [x] ストリークフリーズ(サボり許容)・習慣ごとの週次頻度設定
- [ ] 複数端末同期が必要になった場合のバックエンドDB検討(Google OIDC認証込みで要件確認後に着手)
- [ ] コンポーネント/E2Eテスト(ロジック層のみで、UI側のテストはまだなし)
- [ ] チャット機能もフルで使えるようにするなら、`api/chat.js`をVercel等に別途デプロイし、
      GitHub Pages版のフロントから叩けるようCORS/エンドポイントを見直す必要がある
- [ ] 効果音・モンスターの読み上げ(TTS)などの音声拡張(未着手、次候補)
