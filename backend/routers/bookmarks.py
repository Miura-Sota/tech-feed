from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List
from pydantic import BaseModel

from database import get_db
from models import Bookmark, Article

router = APIRouter(prefix="/bookmarks", tags=["bookmarks"])


class ArticleOut(BaseModel):
    id: int
    title: str
    url: str
    source: str
    author: str | None
    published_at: datetime | None
    summary: str | None
    tags: str | None
    is_picked: bool
    fetched_at: datetime | None

    class Config:
        from_attributes = True


@router.get("/", response_model=List[ArticleOut])
def get_bookmarks(db: Session = Depends(get_db)):
    """ブックマーク済み記事一覧を返す"""
    bookmarks = db.query(Bookmark).order_by(Bookmark.created_at.desc()).all()
    article_ids = [b.article_id for b in bookmarks]
    if not article_ids:
        return []
    articles = db.query(Article).filter(Article.id.in_(article_ids)).all()
    # ブックマーク登録順を維持
    order = {aid: i for i, aid in enumerate(article_ids)}
    return sorted(articles, key=lambda a: order.get(a.id, 0))


@router.post("/{article_id}", status_code=201)
def add_bookmark(article_id: int, db: Session = Depends(get_db)):
    """ブックマーク追加"""
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    existing = db.query(Bookmark).filter_by(article_id=article_id).first()
    if existing:
        return {"message": "Already bookmarked"}
    bookmark = Bookmark(article_id=article_id)
    db.add(bookmark)
    db.commit()
    return {"message": "Bookmarked"}


@router.delete("/{article_id}")
def remove_bookmark(article_id: int, db: Session = Depends(get_db)):
    """ブックマーク解除"""
    bookmark = db.query(Bookmark).filter_by(article_id=article_id).first()
    if not bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    db.delete(bookmark)
    db.commit()
    return {"message": "Removed"}
