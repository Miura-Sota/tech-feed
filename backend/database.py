from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

import os

url = os.environ.get("DATABASE_URL")
if url:
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    SQLALCHEMY_DATABASE_URL = url
    connect_args = {}
else:
    DB_PATH = os.environ.get("DB_PATH", "./tech_feed.db")
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"
    connect_args = {"check_same_thread": False}

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
