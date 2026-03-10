import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime, timezone
from typing import List
from pydantic import BaseModel

from database import get_db, SessionLocal
from models import Article, Feed, User
import rss_service
import ai_service
from auth import get_current_user

logger = logging.getLogger(__name__)

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
def trigger_fetch(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
):
    """手動でRSSフェッチ + AI処理をトリガー（管理者のみ）"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin only")
    background_tasks.add_task(_fetch_and_process)
    return {"message": "Fetch started in background"}


def _fetch_and_process():
    """RSS取得 → DB保存 → AI要約 → おすすめ選定"""
    from sqlalchemy import func as sqlfunc
    db = SessionLocal()
    try:
        preferred_tags = ""
        preferred_keywords = ""
        # 全アクティブフィードを対象（ユーザー個別フィルターなし）
        custom_feeds = [
            {"name": f.name, "url": f.url}
            for f in db.query(Feed).filter_by(is_active=True).all()
        ]
        raw_articles = rss_service.fetch_all_articles(preferred_tags=preferred_tags, custom_feeds=custom_feeds)

        # 既存URLを一括チェックしてバッチ挿入
        urls = [a["url"] for a in raw_articles]
        existing_urls = {
            row.url
            for row in db.query(Article.url).filter(Article.url.in_(urls)).all()
        }
        new_articles = [Article(**a) for a in raw_articles if a["url"] not in existing_urls]
        if new_articles:
            db.add_all(new_articles)
            db.commit()
        saved = new_articles

        # AI要約・タグ付け（未処理の今日の記事すべて対象）
        today = date.today()
        unsummarized = (
            db.query(Article)
            .filter(sqlfunc.date(Article.fetched_at) == today, Article.summary == None)
            .all()
        )

        def _summarize(article_id: int, title: str, snippet: str):
            result = ai_service.summarize_article(title=title, snippet=snippet)
            return article_id, result["summary"], result["tags"]

        article_data = [(a.id, a.title, a.content_snippet or "") for a in unsummarized]
        summary_results = []
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = {
                executor.submit(_summarize, aid, title, snippet): aid
                for aid, title, snippet in article_data
            }
            for future in as_completed(futures):
                try:
                    summary_results.append(future.result())
                except Exception as e:
                    logger.error(f"Summarization failed: {e}")

        if summary_results:
            for article_id, summary, tags in summary_results:
                db.query(Article).filter(Article.id == article_id).update(
                    {"summary": summary, "tags": tags}
                )
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
            pick_indices = ai_service.pick_top_articles(
                articles_dicts,
                preferred_tags=preferred_tags,
                preferred_keywords=preferred_keywords,
            )
            for i, article in enumerate(today_articles):
                article.is_picked = i in pick_indices
            db.commit()

        return {"fetched": len(raw_articles), "saved": len(saved)}
    finally:
        db.close()
