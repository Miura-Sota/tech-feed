# Tech Feed - パーソナルTechニュースフィード

Zenn/QiitaのRSS記事をAIが要約・タグ付け・ピックアップして、毎朝「今日の技術まとめ」を届けるWebアプリ。

## 技術スタック

| 層 | 技術 |
|---|---|
| フロントエンド | React + Vite |
| バックエンド | FastAPI |
| DB | SQLite + SQLAlchemy |
| AI | Claude claude-haiku-4-5 (Anthropic) |
| RSS取得 | feedparser |
| スケジューラー | APScheduler |

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

# サーバー起動
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
2. 「今すぐ取得」ボタンでRSSフェッチ + AI処理を手動トリガー
3. 数秒後に画面が自動更新され、要約・タグ付き記事が表示される
4. 毎朝7時(JST)に自動実行

---

## API エンドポイント

| メソッド | パス | 説明 |
|---|---|---|
| GET | /articles/today | 当日の記事一覧（おすすめ優先） |
| GET | /articles/picks | 今日のおすすめ3本 |
| GET | /articles/ | 全記事（新着順） |
| POST | /articles/fetch | RSS取得 + AI処理を手動トリガー |
| GET | /health | ヘルスチェック |

---

## ディレクトリ構成

```
tech-feed/
  backend/
    main.py          - FastAPIアプリ起動
    database.py      - DB接続・セッション
    models.py        - Article, Feed モデル
    scheduler.py     - 毎日07:00 JST 自動フェッチ
    rss_service.py   - RSS取得 (feedparser)
    ai_service.py    - Claude API (要約・タグ・ピックアップ)
    routers/
      articles.py    - 記事APIエンドポイント
    requirements.txt
  frontend/
    src/
      App.jsx
      components/
        TodaysPicks.jsx  - AIおすすめ3本
        ArticleCard.jsx  - 記事カード
        ArticleList.jsx  - 記事一覧
    package.json
    vite.config.js
  .env.example
```
