from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from database import get_db
from models import Preferences, Feed

router = APIRouter(prefix="/settings", tags=["settings"])


class PreferencesOut(BaseModel):
    id: int
    preferred_tags: str
    preferred_keywords: str

    class Config:
        from_attributes = True


class PreferencesIn(BaseModel):
    preferred_tags: str = ""
    preferred_keywords: str = ""


def _get_or_create(db: Session) -> Preferences:
    prefs = db.query(Preferences).filter_by(id=1).first()
    if prefs is None:
        prefs = Preferences(id=1, preferred_tags="", preferred_keywords="")
        db.add(prefs)
        db.commit()
        db.refresh(prefs)
    return prefs


@router.get("/preferences", response_model=PreferencesOut)
def get_preferences(db: Session = Depends(get_db)):
    return _get_or_create(db)


@router.put("/preferences", response_model=PreferencesOut)
def update_preferences(body: PreferencesIn, db: Session = Depends(get_db)):
    prefs = _get_or_create(db)
    prefs.preferred_tags = body.preferred_tags
    prefs.preferred_keywords = body.preferred_keywords
    db.commit()
    db.refresh(prefs)
    return prefs


class FeedOut(BaseModel):
    id: int
    name: str
    url: str
    is_active: bool
    created_at: datetime | None

    class Config:
        from_attributes = True


class FeedIn(BaseModel):
    name: str
    url: str


@router.get("/feeds", response_model=List[FeedOut])
def get_feeds(db: Session = Depends(get_db)):
    """カスタムフィード一覧を返す"""
    return db.query(Feed).order_by(Feed.created_at.asc()).all()


@router.post("/feeds", response_model=FeedOut, status_code=201)
def add_feed(body: FeedIn, db: Session = Depends(get_db)):
    """カスタムフィード追加"""
    feed = Feed(name=body.name, url=body.url)
    db.add(feed)
    db.commit()
    db.refresh(feed)
    return feed


@router.delete("/feeds/{feed_id}")
def delete_feed(feed_id: int, db: Session = Depends(get_db)):
    """カスタムフィード削除"""
    feed = db.query(Feed).filter(Feed.id == feed_id).first()
    if not feed:
        raise HTTPException(status_code=404, detail="Feed not found")
    db.delete(feed)
    db.commit()
    return {"message": "Deleted"}


@router.patch("/feeds/{feed_id}", response_model=FeedOut)
def toggle_feed(feed_id: int, db: Session = Depends(get_db)):
    """フィードの有効/無効をトグル"""
    feed = db.query(Feed).filter(Feed.id == feed_id).first()
    if not feed:
        raise HTTPException(status_code=404, detail="Feed not found")
    feed.is_active = not feed.is_active
    db.commit()
    db.refresh(feed)
    return feed
