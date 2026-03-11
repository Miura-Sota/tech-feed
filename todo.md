# TODO

## 未着手

### [x] #1 管理者ユーザーを決める仕組みを実装する
- **背景**: `is_admin` フィールドは DB に存在するが、設定手段がない（DB直接操作のみ）
- **関連ファイル**:
  - `backend/models.py` — `is_admin` カラム
  - `backend/routers/articles.py` — `/articles/fetch` は管理者のみ
  - `backend/routers/auth.py` — 登録・ログイン API
- **検討案**:
  - 初回登録ユーザーを自動的に管理者にする
  - 環境変数で管理者メールを指定する
  - 管理者昇格 API を追加する

### [x] #2 非管理者・ゲスト向けの空状態メッセージを修正する
- **背景**: 記事がないとき「今すぐ取得」ボタンを案内するメッセージが表示されるが、
  ボタンは管理者にしか表示されないため、非管理者・ゲストには操作不能な案内になっている
- **関連ファイル**:
  - `frontend/src/components/ArticleList.jsx:18-24` — デフォルト空状態メッセージ
  - `frontend/src/App.jsx:312` — 管理者のみ表示の「今すぐ取得」ボタン
- **修正方針**:
  - 管理者: 現行メッセージのまま（「今すぐ取得」ボタンで取得してください）
  - 非管理者・ゲスト: 「記事はまだありません。毎朝7時に自動取得されます。」等に変更
  - `App.jsx` から `ArticleList` へ `isAdmin` prop を渡して切り替える

### [x] #3 7時自動フェッチが動作していない（記事が取得されない・表示されない）
- **背景**: 仕様では毎朝7時 JST に今日のおすすめ記事を取得するはずだが、取得されておらず記事が表示されない
- **関連ファイル**:
  - `.github/workflows/daily_fetch.yml` — GitHub Actions による自動実行
  - `backend/routers/articles.py` — `POST /articles/fetch` エンドポイント
  - `render.yaml` — 本番環境のデプロイ設定
- **調査ポイント**:
  - GitHub Actions が実行されているか
  - Render へのリクエストが届いているか（URL・認証）
  - フェッチ API の実行結果（エラーログ）
