"""
一回限りの移行スクリプト: 既存 SQLite に user_id 列を追加する。
複数回実行しても安全（列存在チェック付き）。

実行方法:
  cd backend
  python migrate_auth.py
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "tech_feed.db")


def column_exists(cursor, table: str, column: str) -> bool:
    cursor.execute(f"PRAGMA table_info({table})")
    return any(row[1] == column for row in cursor.fetchall())


def table_exists(cursor, table: str) -> bool:
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
    return cursor.fetchone() is not None


def migrate():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # users テーブルを先に作成（なければ）
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email VARCHAR(254) NOT NULL UNIQUE,
            hashed_password VARCHAR(128) NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT 1,
            is_admin BOOLEAN NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT (CURRENT_TIMESTAMP)
        )
    """)

    # preferences に user_id 追加（テーブルが存在する場合のみ）
    if table_exists(cur, "preferences"):
        if not column_exists(cur, "preferences", "user_id"):
            cur.execute("ALTER TABLE preferences ADD COLUMN user_id INTEGER REFERENCES users(id)")
            print("preferences.user_id 追加")
        else:
            print("preferences.user_id は既に存在")
    else:
        print("preferences テーブルは未作成（サーバー起動時に自動作成されます）")

    # feeds に user_id 追加
    if table_exists(cur, "feeds"):
        if not column_exists(cur, "feeds", "user_id"):
            cur.execute("ALTER TABLE feeds ADD COLUMN user_id INTEGER REFERENCES users(id)")
            print("feeds.user_id 追加")
        else:
            print("feeds.user_id は既に存在")
    else:
        print("feeds テーブルは未作成（サーバー起動時に自動作成されます）")

    # bookmarks に user_id 追加
    if table_exists(cur, "bookmarks"):
        if not column_exists(cur, "bookmarks", "user_id"):
            cur.execute("ALTER TABLE bookmarks ADD COLUMN user_id INTEGER REFERENCES users(id)")
            print("bookmarks.user_id 追加")
        else:
            print("bookmarks.user_id は既に存在")
    else:
        print("bookmarks テーブルは未作成（サーバー起動時に自動作成されます）")

    # read_marks に user_id 追加
    if table_exists(cur, "read_marks"):
        if not column_exists(cur, "read_marks", "user_id"):
            cur.execute("ALTER TABLE read_marks ADD COLUMN user_id INTEGER REFERENCES users(id)")
            print("read_marks.user_id 追加")
        else:
            print("read_marks.user_id は既に存在")
    else:
        print("read_marks テーブルは未作成（サーバー起動時に自動作成されます）")

    conn.commit()
    conn.close()
    print("移行完了")
    print()
    print("次のステップ:")
    print("  1. python -m uvicorn main:app でサーバー起動")
    print("  2. /auth/register でアカウント作成")
    print("  3. 既存データを自分に紐付ける場合:")
    print("     sqlite3 tech_feed.db")
    print("     UPDATE bookmarks SET user_id=1 WHERE user_id IS NULL;")
    print("     UPDATE read_marks SET user_id=1 WHERE user_id IS NULL;")
    print("     UPDATE preferences SET user_id=1 WHERE user_id IS NULL;")
    print("     UPDATE feeds SET user_id=1 WHERE user_id IS NULL;")
    print("  4. 最初のユーザーを管理者にする:")
    print("     UPDATE users SET is_admin=1 WHERE id=1;")


if __name__ == "__main__":
    migrate()
