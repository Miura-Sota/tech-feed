"""Pytest fixtures for auth tests."""
import os
import tempfile

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from database import get_db
from models import Base
from main import app


@pytest.fixture
def client():
    """テスト用のDBセッションで get_db を上書きした TestClient。"""
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    try:
        engine = create_engine(
            f"sqlite:///{path}",
            connect_args={"check_same_thread": False},
        )
        Base.metadata.create_all(bind=engine)
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

        def override_get_db():
            db = TestingSessionLocal()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        with TestClient(app) as c:
            yield c
    finally:
        app.dependency_overrides.clear()
        try:
            os.unlink(path)
        except OSError:
            pass
