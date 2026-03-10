from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
from sqlalchemy.sql import func
from database import Base


class Feed(Base):
    __tablename__ = "feeds"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    url = Column(String(500), nullable=False, unique=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Article(Base):
    __tablename__ = "articles"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    url = Column(String(500), nullable=False, unique=True)
    source = Column(String(100))  # "zenn" or "qiita"
    author = Column(String(200))
    published_at = Column(DateTime(timezone=True))
    content_snippet = Column(Text)  # 元記事の冒頭テキスト
    summary = Column(Text)          # AIが生成した3行要約
    tags = Column(String(500))      # カンマ区切りタグ
    is_picked = Column(Boolean, default=False)  # 今日のおすすめ
    fetched_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
