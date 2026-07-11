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
  Anthropic APIに直接fetch、それ以外では `/api/chat` を叩く設計にしてある。
- 論点: `api/chat.js`は未実装のスタブ。ホスティング先(Vercel/Cloudflare Workers等)が
  決まり次第、`ANTHROPIC_API_KEY`をサーバー側にのみ持たせる形で実装すること。
  レート制限・不正利用対策(1ユーザーあたりの送信回数上限など)も未検討。

### 3. GitHub ★バッジ — `src/components/GithubStarBadge.jsx`
- 公開API `api.github.com/repos/{owner}/{repo}` を認証なしで叩いているだけ(読み取り専用)。
- 未認証GitHub APIはIPベースで60req/hourの制限あり。アクセスが増えるようならキャッシュ
  (例: 5分程度のstale-while-revalidate)を検討。
- 実際に★を「付け外し」する機能は要件から除外済み(表示+リンクのみ)。

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
api/
  chat.js             会話バックエンドのスタブ(未実装)
```

## 未実装 / TODO
- [ ] `api/chat.js` の実装とデプロイ設定
- [ ] GitHub ★バッジのレート制限対策(必要になれば)
- [ ] 複数端末同期が必要になった場合のバックエンドDB検討
- [ ] E2E/ユニットテスト(現状なし)
