# Tech Feed - パーソナルTechニュースフィード

Zenn/QiitaのRSS記事をAIが要約・タグ付け・ピックアップして、毎朝「今日の技術まとめ」を届けるWebアプリ。

## 技術スタック

| 層 | 技術 |
|---|---|
| フロントエンド | React + Vite |
| バックエンド | FastAPI |
| DB | SQLite + SQLAlchemy |
| AI | Claude Haiku (Anthropic) |
| RSS取得 | feedparser |
| スケジューラー | APScheduler |

---

## 機能

- **今日の記事一覧** — Zenn/Qiitaから取得した当日の記事をAI要約・タグ付きで表示
- **AIおすすめ3本** — AIが特に有益な記事を3本ピックアップ
- **検索・タグフィルター** — タイトル・要約・タグでリアルタイム絞り込み
- **既読マーク** — 読んだ記事を半透明で表示（ローカル保存）
- **ブックマーク（DB保存）** — 記事をブックマーク保存。DBに永続化されるため、デバイスをまたいでも保持される
- **好みのタグ設定** — 好みのタグを選択すると、タグ別RSSフィードも追加取得してAIのおすすめ選定に反映。好みタグが設定されている場合は一致する記事のみ表示（フィルタリング）。複数タグ設定時はOR/ANDの切り替えが可能（設定画面で即時変更・localStorage保存）
- **好みのキーワード設定** — フリーキーワード（例: Next.js, Wasm）を設定すると、AIおすすめ選定と記事ハイライトに反映
- **カスタムRSSフィード** — Zenn/Qiita以外の任意のRSSフィードを登録・有効/無効管理。登録フィードの記事も一覧・おすすめ対象に含まれる

---

## セットアップ

### 1. 環境変数

```bash
cp .env.example .env
# .env を編集して ANTHROPIC_API_KEY を設定
```

### 2. バックエンド起動

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
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

---

## 使い方

1. ブラウザで http://localhost:5173 を開く
2. 「設定 ⚙」タブで好みのタグ・キーワード・カスタムフィードを設定（任意）
3. 「今すぐ取得」ボタンでRSSフェッチ + AI処理を手動トリガー
4. 数秒後に画面が自動更新され、要約・タグ付き記事が表示される
5. 毎朝7時(JST)に自動実行

---

## API エンドポイント

| メソッド | パス | 説明 |
|---|---|---|
| GET | /articles/today | 当日の記事一覧（おすすめ優先） |
| GET | /articles/picks | 今日のおすすめ3本 |
| GET | /articles/ | 全記事（新着順） |
| POST | /articles/fetch | RSS取得 + AI処理を手動トリガー |
| GET | /settings/preferences | 好みタグ・キーワード取得 |
| PUT | /settings/preferences | 好みタグ・キーワード更新 |
| GET | /settings/feeds | カスタムフィード一覧 |
| POST | /settings/feeds | カスタムフィード追加 |
| DELETE | /settings/feeds/{id} | カスタムフィード削除 |
| PATCH | /settings/feeds/{id} | カスタムフィード有効/無効トグル |
| GET | /bookmarks/ | ブックマーク済み記事一覧 |
| POST | /bookmarks/{article_id} | ブックマーク追加 |
| DELETE | /bookmarks/{article_id} | ブックマーク解除 |
| GET | /health | ヘルスチェック |

---

## ディレクトリ構成

```
tech-feed/
  backend/
    main.py          - FastAPIアプリ起動
    database.py      - DB接続・セッション
    models.py        - Article, Feed, Preferences, Bookmark モデル
    scheduler.py     - 毎日07:00 JST 自動フェッチ
    rss_service.py   - RSS取得 (feedparser, タグ別・カスタムフィード対応)
    ai_service.py    - Claude API (要約・タグ・ピックアップ)
    routers/
      articles.py    - 記事APIエンドポイント
      settings.py    - 設定APIエンドポイント（preferences + feeds）
      bookmarks.py   - ブックマークAPIエンドポイント
    requirements.txt
  frontend/
    src/
      App.jsx
      components/
        TodaysPicks.jsx   - AIおすすめ3本
        ArticleCard.jsx   - 記事カード（好みタグ/キーワードハイライト対応）
        ArticleList.jsx   - 記事一覧
        SettingsPanel.jsx - タグ・キーワード・カスタムフィード設定UI
    package.json
    vite.config.js
  .env.example
```
