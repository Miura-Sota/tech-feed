"""Settings router tests（カスタムフィード管理者限定）。"""
from fastapi.testclient import TestClient


def _token(client: TestClient, email: str, password: str) -> str:
    """登録またはログインして access_token を取得"""
    res = client.post("/auth/login", json={"email": email, "password": password})
    if res.status_code != 200:
        res = client.post("/auth/register", json={"email": email, "password": password})
    return res.json()["access_token"]


def test_admin_can_get_and_add_feeds(client: TestClient) -> None:
    """管理者はフィード一覧取得・追加ができる。"""
    token = _token(client, "admin@example.com", "password123")
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/settings/feeds", headers=headers)
    assert res.status_code == 200
    assert res.json() == []

    res = client.post(
        "/settings/feeds",
        headers={**headers, "Content-Type": "application/json"},
        json={"name": "Test Feed", "url": "https://example.com/feed.xml"},
    )
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Test Feed"
    assert data["url"] == "https://example.com/feed.xml"
    assert data["is_active"] is True

    res = client.get("/settings/feeds", headers=headers)
    assert res.status_code == 200
    assert len(res.json()) == 1


def test_non_admin_gets_403_on_feeds(client: TestClient) -> None:
    """非管理者はフィード API で 403 を返す。"""
    client.post("/auth/register", json={"email": "first@example.com", "password": "password123"})
    client.post("/auth/register", json={"email": "second@example.com", "password": "password123"})
    token = _token(client, "second@example.com", "password123")
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/settings/feeds", headers=headers)
    assert res.status_code == 403

    res = client.post(
        "/settings/feeds",
        headers={**headers, "Content-Type": "application/json"},
        json={"name": "X", "url": "https://x.com/feed.xml"},
    )
    assert res.status_code == 403
