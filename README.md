# Tech Feed - パーソナルTechニュースフィード

Zenn/QiitaのRSS記事をAIが要約・タグ付け・ピックアップして、毎朝「今日の技術まとめ」を届けるWebアプリ。
メール+パスワード認証でユーザーごとにデータを分離。

## 技術スタック

| 層 | 技術 |
|---|---|
| フロントエンド | React + Vite |
| バックエンド | FastAPI |
| DB | SQLite + SQLAlchemy |
| AI | Claude Haiku (Anthropic) |
| RSS取得 | feedparser |
| 認証 | JWT (PyJWT + passlib/bcrypt) |
| スケジューラー | GitHub Actions (毎朝7時 JST) |

---

## 機能

### 記事閲覧
- **今日のおすすめ** — Zenn/Qiitaから取得した当日の記事をAI要約・タグ付きで表示（認証不要・パブリック）
- **AIおすすめ3本** — AIが特に有益な記事を3本ピックアップ
- **検索・タグフィルター** — タイトル・要約・タグでリアルタイム絞り込み

### ユーザー機能（要ログイン）
- **認証** — メール+パスワードでログイン/新規登録。JWTトークン（7日有効）をlocalStorageに保存し、再訪問時も自動ログイン
- **既読マーク** — ユーザーごとにDB保存。デバイスをまたいでも既読状態が同期
- **ブックマーク** — ユーザーごとにDB保存。他ユーザーには見えない

### カスタマイズ（設定画面）
- **好みのタグ設定** — 好みのタグを選択するとAIのおすすめ選定に反映。OR/AND切り替え・「すべてクリア」対応
- **好みのキーワード設定** — フリーキーワードを設定するとAIおすすめ選定と記事ハイライトに反映
- **カスタムRSSフィード** — Zenn/Qiita以外の任意のRSSフィードを登録・有効/無効管理（ユーザーごと）

### 管理者機能
- **自動フェッチ** — 毎朝7時 JST に GitHub Actions が `/articles/fetch` を叩く。管理者はUIの「今すぐ取得」ボタンも使用可能

---

## セットアップ

### 1. 環境変数

```bash
cp .env.example .env
# .env を編集して以下を設定:
#   ANTHROPIC_API_KEY=...
#   JWT_SECRET_KEY=<ランダムな長い文字列>
```

### 2. バックエンド起動

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python migrate_auth.py    # DBマイグレーション（初回のみ）
uvicorn main:app --reload
```

バックエンドは http://localhost:8000 で起動。APIドキュメント: http://localhost:8000/docs

### 3. フロントエンド起動

```bash
cd frontend
npm install
npm run dev
```

フロントエンドは http://localhost:5173 で起動。

### 4. 初回ユーザー設定

1. http://localhost:5173 を開き「新規登録」でアカウントを作成
2. 最初のユーザー（id=1）を管理者に昇格:

```bash
# backend/ ディレクトリで
python -c "
import sqlite3
conn = sqlite3.connect('tech_feed.db')
conn.execute('UPDATE users SET is_admin=1 WHERE id=1')
conn.commit()
print('Done')
"
```

管理者はヘッダーに「今すぐ取得」ボタンが表示される。

---

## 自動フェッチ（GitHub Actions）

毎朝7時 JST（22:00 UTC）に GitHub Actions が記事を取得する。
`.github/workflows/daily_fetch.yml` が管理者アカウントでログインし `/articles/fetch` を呼び出す。

**GitHub Secrets に登録するもの（Settings → Secrets and variables → Actions）:**

| Secret | 値 |
|---|---|
| `API_URL` | `https://<your-backend>.onrender.com` |
| `ADMIN_EMAIL` | 管理者アカウントのメールアドレス |
| `ADMIN_PASSWORD` | 管理者アカウントのパスワード |

手動実行: Actions タブ → Daily Fetch → Run workflow

---

## API エンドポイント

### 認証（認証不要）

| メソッド | パス | 説明 |
|---|---|---|
| POST | /auth/register | 新規登録 → `{ access_token, user_id, email, is_admin }` |
| POST | /auth/login | ログイン → `{ access_token, user_id, email, is_admin }` |
| GET | /auth/me | 認証済みユーザー情報（要Bearer） |

### 記事（GET は認証不要、POST は管理者のみ）

| メソッド | パス | 説明 |
|---|---|---|
| GET | /articles/today | 当日の記事一覧（おすすめ優先） |
| GET | /articles/picks | 今日のおすすめ3本 |
| GET | /articles/ | 全記事（新着順） |
| POST | /articles/fetch | RSS取得 + AI処理を手動トリガー（管理者のみ） |

### 設定（要認証 / ユーザースコープ）

| メソッド | パス | 説明 |
|---|---|---|
| GET | /settings/preferences | 好みタグ・キーワード取得 |
| PUT | /settings/preferences | 好みタグ・キーワード更新 |
| GET | /settings/feeds | カスタムフィード一覧 |
| POST | /settings/feeds | カスタムフィード追加 |
| DELETE | /settings/feeds/{id} | カスタムフィード削除 |
| PATCH | /settings/feeds/{id} | カスタムフィード有効/無効トグル |

### ブックマーク・既読（要認証 / ユーザースコープ）

| メソッド | パス | 説明 |
|---|---|---|
| GET | /bookmarks/ | ブックマーク済み記事一覧 |
| POST | /bookmarks/{article_id} | ブックマーク追加 |
| DELETE | /bookmarks/{article_id} | ブックマーク解除 |
| GET | /read-marks/ | 既読マーク一覧 |
| POST | /read-marks/{article_id} | 既読追加 |
| DELETE | /read-marks/{article_id} | 既読解除 |

| メソッド | パス | 説明 |
|---|---|---|
| GET | /health | ヘルスチェック |

---

## ディレクトリ構成

```
tech-feed/
  .github/
    workflows/
      daily_fetch.yml  - 毎朝7時 JST 自動フェッチ (GitHub Actions)
  backend/
    main.py            - FastAPIアプリ起動
    database.py        - DB接続・セッション
    models.py          - User, Article, Feed, Preferences, Bookmark, ReadMark モデル
    auth.py            - JWT生成・検証・get_current_user依存関係
    migrate_auth.py    - SQLiteマイグレーションスクリプト（初回のみ実行）
    rss_service.py     - RSS取得 (feedparser, タグ別・カスタムフィード対応)
    ai_service.py      - Claude API (要約・タグ・ピックアップ)
    routers/
      auth.py          - 認証APIエンドポイント
      articles.py      - 記事APIエンドポイント
      settings.py      - 設定APIエンドポイント（preferences + feeds）
      bookmarks.py     - ブックマークAPIエンドポイント
      read_marks.py    - 既読マークAPIエンドポイント
    requirements.txt
  frontend/
    src/
      api.js           - fetch ラッパー（トークン自動注入・401ハンドリング）
      App.jsx
      components/
        AuthPage.jsx      - ログイン/新規登録UI
        TodaysPicks.jsx   - AIおすすめ3本
        ArticleCard.jsx   - 記事カード（好みタグ/キーワードハイライト対応）
        ArticleList.jsx   - 記事一覧
        SettingsPanel.jsx - タグ・キーワード・カスタムフィード設定UI
    package.json
    vite.config.js
  .env.example
```
