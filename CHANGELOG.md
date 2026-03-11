# Changelog

このプロジェクトの変更履歴。[Keep a Changelog](https://keepachangelog.com/ja/1.0.0/) 形式に準拠。

## [Unreleased]

### Added

- `.cursor/rules/ai-instructions.mdc` - AI への指示書（Plan-Act-Reflect、YAGNI/KISS/DRY/OAOO 等）
- ArticleList の空状態メッセージ切り替えテスト（vitest + @testing-library/react）
- 初回登録ユーザーを自動的に管理者にする（`backend/routers/auth.py`）
- 認証 API のテスト（`backend/tests/test_auth.py`）
- 記事APIの認証別テスト（`backend/tests/test_articles.py`）
- `articles.is_picked_admin` カラム

### Changed

- **SQLite → PostgreSQL 移行**: DATABASE_URL 設定時は PostgreSQL（Neon 等）を使用。未設定時はローカル SQLite をフォールバック。Render の永続ディスクを削除し、外部 DB でデプロイ後もユーザーデータを永続化
- migrate_auth.py を削除（起動時の create_all でテーブル自動作成）
- **記事・ピックの管理者/ゲスト分離**: 7時フェッチで管理者のフィード・タグ・キーワードは管理者のみに反映。ゲスト・非管理者はデフォルト（Zenn/Qiita）のみ表示、純AI選定。管理者はカスタムフィード含め、好みを考慮した選定
- カスタムRSSフィードを管理者限定に（非管理者は設定UI非表示、7時フェッチにも管理者のフィードのみ使用）
- 好みタグ・キーワードを管理者限定に（非管理者は設定UI非表示、フィルタ/ハイライト無効）
- CORS オリジンを環境変数 `CORS_ORIGINS`（カンマ区切り）で設定可能に
- Daily Fetch ワークフロー: Render コールドスタート対応（5回リトライ・エラー時に HTTP ステータス表示）
- Daily Fetch: API_URL 未設定時・ログイン/フェッチ失敗時のエラーメッセージを改善

### Fixed

- ログイン・新規登録時に記事が消えるバグを修正（handleAuth の setArticles([]) を削除）
- 非管理者・ゲスト向けの空状態メッセージを修正（「毎朝7時に自動取得されます。」に変更）

## [0.6.0] - 2026-03-11

本番安定化・Python 3.14 対応

### Fixed

- passlib を除去し bcrypt を直接使用（Python 3.14 互換性対応）
- bcrypt の 72 バイト制限エラーを修正
- 500 エラー時も CORS ヘッダーを返す例外ハンドラーを追加

### Changed

- デバッグ用コード（health エンドポイントの Python バージョン情報）を削除

### Docs

- `CLAUDE.md` を追加（Claude Code 向けプロジェクトガイド）

## [0.5.0] - 2026-03-10

ゲストアクセス・UX 改善

### Added

- ゲストアクセス対応（認証不要で記事を閲覧可能）
- 好みタグによる記事フィルタリング（OR / AND 切り替え）
- 設定一括クリアボタン

### Changed

- タブ名を「今日のおすすめ」に変更

## [0.4.0] - 2026-03-10

マルチユーザー認証・DB 同期

### Added

- マルチユーザー認証実装（JWT + bcrypt）
- `/auth/register` / `/auth/login` / `/auth/me` エンドポイント
- 既読マークを DB 保存に変更（デバイス間同期）
- カスタム RSS フィードの追加・管理 UI / API
- キーワード機能強化（AI おすすめ選定・ハイライトに反映）
- ブックマークを DB に保存
- GitHub Actions による毎朝 7 時 JST 自動フェッチ（APScheduler から移行）
- `AuthPage` コンポーネント

### Fixed

- `handleBookmark` の TDZ エラーで白画面になるバグを修正

## [0.3.0] - 2026-03-10

パフォーマンス・記事表示改善

### Added

- 記事一覧を 50 件ずつ表示し「もっと見る」ボタン
- 取得記事数を最大 50 件に制限、タグ別フィード優先取得

### Performance

- RSS フィードと AI 要約を並列処理（`ThreadPoolExecutor`）
- フェッチ時間を約 150 秒 → 約 30 秒に短縮

### Fixed

- おすすめ 0 件バグと scheduler の `TypeError` を修正
- 好みタグがおすすめに反映されないバグを修正

## [0.2.0] - 2026-03-10

ユーザー設定・既読・ブックマーク

### Added

- ユーザー設定（好みタグ・キーワード）機能
- 既読マーク・ブックマーク機能（localStorage 永続化）
- 「今日」「ブックマーク」タブ
- 好みタグの RSS フィード優先取得

## [0.1.0] - 2026-03-10

初期リリース

### Added

- RSS フィード取得（Zenn / Qiita）+ AI 要約・タグ付け・ピックアップ（Claude Haiku）
- 検索・タグフィルター機能
- Render デプロイ設定（`render.yaml`）
