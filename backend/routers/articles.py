import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime, timezone
from typing import List
from pydantic import BaseModel

from database import get_db, SessionLocal
from models import Article, Feed, User, Preferences
import rss_service
import ai_service
from auth import get_current_user, get_current_user_optional

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/articles", tags=["articles"])

# デフォルトソース（Zenn/Qiita）＝ ゲスト・非管理者に表示
DEFAULT_SOURCES = {"zenn", "qiita"}


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


def _to_article_out(a: Article, is_admin: bool) -> dict:
    """管理者なら is_picked_admin、否則 is_picked を is_picked として返す"""
    return ArticleOut(
        id=a.id,
        title=a.title,
        url=a.url,
        source=a.source or "",
        author=a.author,
        published_at=a.published_at,
        summary=a.summary,
        tags=a.tags,
        is_picked=a.is_picked_admin if is_admin else a.is_picked,
        fetched_at=a.fetched_at,
    ).model_dump()


@router.get("/", response_model=List[ArticleOut])
def get_articles(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """全記事を取得（新着順）。管理者は全ソース、それ以外はデフォルトのみ"""
    is_admin = current_user is not None and current_user.is_admin
    q = db.query(Article).order_by(Article.fetched_at.desc())
    if not is_admin:
        q = q.filter(Article.source.in_(list(DEFAULT_SOURCES)))
    articles = q.offset(skip).limit(limit).all()
    return [_to_article_out(a, is_admin) for a in articles]


@router.get("/today", response_model=List[ArticleOut])
def get_today_articles(
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """当日取得した記事を返す。管理者は全ソース、それ以外はデフォルトのみ"""
    today = date.today()
    is_admin = current_user is not None and current_user.is_admin
    pick_col = Article.is_picked_admin if is_admin else Article.is_picked
    q = db.query(Article).filter(func.date(Article.fetched_at) == today)
    if not is_admin:
        q = q.filter(Article.source.in_(list(DEFAULT_SOURCES)))
    articles = q.order_by(pick_col.desc(), Article.fetched_at.desc()).all()
    return [_to_article_out(a, is_admin) for a in articles]


@router.get("/picks", response_model=List[ArticleOut])
def get_picks(
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """今日のおすすめ記事を返す。管理者は管理者用ピック、それ以外はゲスト用ピック"""
    today = date.today()
    is_admin = current_user is not None and current_user.is_admin
    q = db.query(Article).filter(func.date(Article.fetched_at) == today)
    if is_admin:
        q = q.filter(Article.is_picked_admin == True)
    else:
        q = q.filter(Article.is_picked == True)
    if not is_admin:
        q = q.filter(Article.source.in_(list(DEFAULT_SOURCES)))
    articles = q.all()
    return [_to_article_out(a, is_admin) for a in articles]


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
    """
    RSS取得 → DB保存 → AI要約 → おすすめ選定
    - ゲスト・非管理者: デフォルト（Zenn/Qiita）のみ、純AI選択
    - 管理者: カスタムフィード含め、タグ・キーワード考慮で選択
    """
    from sqlalchemy import func as sqlfunc
    db = SessionLocal()
    try:
        today = date.today()

        # 1) デフォルト + 管理者カスタムフィードを取得
        custom_feeds = [
            {"name": f.name, "url": f.url}
            for f in db.query(Feed)
            .join(User, Feed.user_id == User.id)
            .filter(Feed.is_active == True, User.is_admin == True)
            .all()
        ]
        raw_articles = rss_service.fetch_all_articles(preferred_tags="", custom_feeds=custom_feeds or None)

        urls = [a["url"] for a in raw_articles]
        existing_urls = {row.url for row in db.query(Article.url).filter(Article.url.in_(urls)).all()}
        new_articles = [Article(**a) for a in raw_articles if a["url"] not in existing_urls]
        if new_articles:
            db.add_all(new_articles)
            db.commit()

        # 2) AI要約・タグ付け（未処理の今日の記事）
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

        # 3) ゲスト向けピック: デフォルトソースのみ、純AI
        default_articles = list(db.query(Article).filter(
            sqlfunc.date(Article.fetched_at) == today,
            Article.source.in_(list(DEFAULT_SOURCES)),
        ).all())
        if default_articles:
            dicts = [{"title": a.title, "source": a.source, "summary": a.summary, "tags": a.tags} for a in default_articles]
            pick_indices = ai_service.pick_top_articles(dicts, preferred_tags="", preferred_keywords="")
            pick_ids = {default_articles[i].id for i in pick_indices}
            db.query(Article).filter(sqlfunc.date(Article.fetched_at) == today).update({"is_picked": False}, synchronize_session=False)
            if pick_ids:
                db.query(Article).filter(Article.id.in_(pick_ids)).update({"is_picked": True}, synchronize_session=False)
            db.commit()

        # 4) 管理者向けピック: 全ソース、タグ・キーワード考慮
        admin_prefs = db.query(Preferences).join(User, Preferences.user_id == User.id).filter(User.is_admin == True).first()
        preferred_tags = (admin_prefs.preferred_tags or "") if admin_prefs else ""
        preferred_keywords = (admin_prefs.preferred_keywords or "") if admin_prefs else ""

        all_today = list(db.query(Article).filter(sqlfunc.date(Article.fetched_at) == today).all())
        if all_today:
            dicts = [{"title": a.title, "source": a.source, "summary": a.summary, "tags": a.tags} for a in all_today]
            pick_indices = ai_service.pick_top_articles(dicts, preferred_tags=preferred_tags, preferred_keywords=preferred_keywords)
            pick_ids = {all_today[i].id for i in pick_indices}
            db.query(Article).filter(sqlfunc.date(Article.fetched_at) == today).update({"is_picked_admin": False}, synchronize_session=False)
            if pick_ids:
                db.query(Article).filter(Article.id.in_(pick_ids)).update({"is_picked_admin": True}, synchronize_session=False)
            db.commit()

        return {"fetched": len(raw_articles), "saved": len(new_articles)}
    finally:
        db.close()
