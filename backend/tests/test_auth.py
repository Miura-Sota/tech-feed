"""Auth router tests."""
import pytest
from fastapi.testclient import TestClient


def test_first_registered_user_is_admin(client: TestClient) -> None:
    """初回登録ユーザーは is_admin=True で返る。"""
    res = client.post(
        "/auth/register",
        json={"email": "admin@example.com", "password": "password123"},
    )
    assert res.status_code == 201
    data = res.json()
    assert data["is_admin"] is True
    assert data["email"] == "admin@example.com"


def test_second_registered_user_is_not_admin(client: TestClient) -> None:
    """2人目以降の登録ユーザーは is_admin=False で返る。"""
    client.post(
        "/auth/register",
        json={"email": "first@example.com", "password": "password123"},
    )
    res = client.post(
        "/auth/register",
        json={"email": "second@example.com", "password": "password123"},
    )
    assert res.status_code == 201
    data = res.json()
    assert data["is_admin"] is False
    assert data["email"] == "second@example.com"


def test_login_preserves_admin_status(client: TestClient) -> None:
    """ログイン時も is_admin が正しく返る。"""
    # 初回登録 → 管理者
    reg = client.post(
        "/auth/register",
        json={"email": "admin@example.com", "password": "password123"},
    )
    assert reg.json()["is_admin"] is True

    # ログインでも is_admin=True
    login = client.post(
        "/auth/login",
        json={"email": "admin@example.com", "password": "password123"},
    )
    assert login.status_code == 200
    assert login.json()["is_admin"] is True
