# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Zenn/QiitaのRSSをAIで要約・タグ付け・ピックアップし、毎朝「今日の技術まとめ」を届けるWebアプリ。

- バックエンド (`backend/`) と フロントエンド (`frontend/`) の2層構成
- 記事フェッチは GitHub Actions が毎朝7時 JST に `POST /articles/fetch` を叩いて実行
- SQLiteをDBに使用。本番（Render）ではDBファイルを永続ディスクに保存

## 技術スタック

| 層 | 技術 |
|---|---|
| フロントエンド | React 18 + Vite |
| バックエンド | FastAPI + Uvicorn |
| DB | SQLite + SQLAlchemy 2.x |
| AI | Claude Haiku (`claude-haiku-4-5-20251001`) |
| RSS取得 | feedparser（ThreadPoolExecutorで並列取得） |
| 認証 | JWT（PyJWT + bcrypt）、7日有効、localStorageに保存 |
| スケジューラー | GitHub Actions（毎朝7時 JST） |
| デプロイ | Render（`render.yaml` で定義） |

## ディレクトリ構成

```
tech-feed/
├── backend/
│   ├── routers/          # APIエンドポイント（auth / articles / settings / bookmarks / read_marks）
│   ├── main.py           # FastAPIアプリ本体・CORS設定
│   ├── database.py       # SQLAlchemy エンジン・セッション
│   ├── models.py         # DB モデル（User / Article / Preferences / Feed / Bookmark / ReadMark）
│   ├── auth.py           # JWT 生成・検証、get_current_user 依存関係
│   ├── rss_service.py    # RSS 並列フェッチ・タグ別フィード構築
│   ├── ai_service.py     # Claude API（要約・タグ付け・ピックアップ）
│   ├── migrate_auth.py   # 初回 DB マイグレーション
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── api.js        # fetch ラッパー（Bearer トークン注入・401 自動ログアウト）
│       ├── App.jsx       # ルートコンポーネント（認証・記事・フィルター等の状態管理）
│       └── components/   # TodaysPicks / ArticleList / ArticleCard / SettingsPanel / AuthPage
├── .github/workflows/
│   └── daily_fetch.yml   # 毎朝7時 JST に記事フェッチを自動実行
├── render.yaml           # Render デプロイ設定
└── .env.example          # 必要な環境変数のテンプレート
```

## 開発ルール

- **テスト**: 追加・変更・削除の作業時には必ずテストを作成し、内容をユーザーに見せる
- **変更履歴**: 作業後は `CHANGELOG.md` に変更内容を記録する
- **タスク管理**: `todo.md` でタスクを管理する。各タスクには必ず一意の番号を `#1`, `#2` のように振る
