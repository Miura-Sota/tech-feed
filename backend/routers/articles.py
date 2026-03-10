from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import cast, Date, func
from datetime import date, datetime, timezone
from typing import List
from pydantic import BaseModel

from database import get_db, SessionLocal
from models import Article
import rss_service
import ai_service

router = APIRouter(prefix="/articles", tags=["articles"])


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
def get_articles(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    """全記事を取得（新着順）"""
    articles = (
        db.query(Article)
        .order_by(Article.fetched_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return articles


@router.get("/today", response_model=List[ArticleOut])
def get_today_articles(db: Session = Depends(get_db)):
    """当日取得した記事を返す"""
    today = date.today()
    articles = (
        db.query(Article)
        .filter(func.date(Article.fetched_at) == today)
        .order_by(Article.is_picked.desc(), Article.fetched_at.desc())
        .all()
    )
    return articles


@router.get("/picks", response_model=List[ArticleOut])
def get_picks(db: Session = Depends(get_db)):
    """今日のおすすめ記事を返す"""
    today = date.today()
    articles = (
        db.query(Article)
        .filter(
            func.date(Article.fetched_at) == today,
            Article.is_picked == True,
        )
        .all()
    )
    return articles


@router.post("/fetch")
def trigger_fetch(background_tasks: BackgroundTasks):
    """手動でRSSフェッチ + AI処理をトリガー"""
    background_tasks.add_task(_fetch_and_process)
    return {"message": "Fetch started in background"}


def _fetch_and_process():
    """RSS取得 → DB保存 → AI要約 → おすすめ選定"""
    from sqlalchemy import func as sqlfunc
    db = SessionLocal()
    try:
        raw_articles = rss_service.fetch_all_articles()
        saved = []

        for a in raw_articles:
            existing = db.query(Article).filter(Article.url == a["url"]).first()
            if existing:
                continue
            article = Article(**a)
            db.add(article)
            db.commit()
            db.refresh(article)
            saved.append(article)

        # AI要約・タグ付け（未処理の今日の記事すべて対象）
        today = date.today()
        unsummarized = (
            db.query(Article)
            .filter(sqlfunc.date(Article.fetched_at) == today, Article.summary == None)
            .all()
        )
        for article in unsummarized:
            result = ai_service.summarize_article(
                title=article.title,
                snippet=article.content_snippet or "",
            )
            article.summary = result["summary"]
            article.tags = result["tags"]
            db.commit()

        # 今日の全記事からおすすめ選定
        today_articles = (
            db.query(Article)
            .filter(sqlfunc.date(Article.fetched_at) == today)
            .all()
        )
        if today_articles:
            articles_dicts = [
                {"title": a.title, "source": a.source, "summary": a.summary, "tags": a.tags}
                for a in today_articles
            ]
            pick_indices = ai_service.pick_top_articles(articles_dicts)
            for i, article in enumerate(today_articles):
                article.is_picked = i in pick_indices
            db.commit()

        return {"fetched": len(raw_articles), "saved": len(saved)}
    finally:
        db.close()
