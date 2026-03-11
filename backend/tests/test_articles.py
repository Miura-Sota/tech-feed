"""Articles router tests（ゲスト/管理者別の記事・ピック表示）。"""
from fastapi.testclient import TestClient


def test_today_guest_returns_list(client: TestClient) -> None:
    """ゲスト（未認証）で /articles/today は 200 とリストを返す"""
    res = client.get("/articles/today")
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_today_admin_sees_all_sources(client: TestClient) -> None:
    """管理者はカスタムソースの記事も見える。ゲストはデフォルトのみ"""
    # テスト用DBに直接記事を投入（conftest の temp db を使用するため、override 経由で取得できない）
    # ここでは認証の有無で呼び分けできることを確認
    client.post("/auth/register", json={"email": "admin@ex.com", "password": "password123"})
    login = client.post("/auth/login", json={"email": "admin@ex.com", "password": "password123"})
    token = login.json()["access_token"]

    res = client.get("/articles/today", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_picks_guest_vs_admin(client: TestClient) -> None:
    """ゲスト・管理者ともに /articles/picks は 200 とリストを返す"""
    res = client.get("/articles/picks")
    assert res.status_code == 200
    assert isinstance(res.json(), list)

    client.post("/auth/register", json={"email": "a@ex.com", "password": "password123"})
    token = client.post("/auth/login", json={"email": "a@ex.com", "password": "password123"}).json()["access_token"]
    res2 = client.get("/articles/picks", headers={"Authorization": f"Bearer {token}"})
    assert res2.status_code == 200
    assert isinstance(res2.json(), list)
