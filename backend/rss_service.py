import feedparser
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from typing import List, Dict, Any
from email.utils import parsedate_to_datetime

logger = logging.getLogger(__name__)

RSS_FEEDS = {
    "zenn": "https://zenn.dev/feed",
    "qiita": "https://qiita.com/popular-items/feed",
}

# 表示タグ → Zenn/Qiita URLスラッグのマッピング
TAG_SLUGS = {
    "React":         "react",
    "Vue":           "vue",
    "TypeScript":    "typescript",
    "Python":        "python",
    "Go":            "go",
    "Rust":          "rust",
    "インフラ":       "infrastructure",
    "AWS":           "aws",
    "Docker":        "docker",
    "Kubernetes":    "kubernetes",
    "セキュリティ":   "security",
    "AI/ML":         "ai",
    "データベース":   "database",
    "API":           "api",
    "フロントエンド": "frontend",
    "バックエンド":   "backend",
    "DevOps":        "devops",
    "パフォーマンス": "performance",
    "テスト":        "test",
    "設計":          "design",
}


def _parse_date(entry: Dict[str, Any]) -> datetime | None:
    """フィードエントリから公開日をパース"""
    for field in ("published", "updated"):
        value = entry.get(field)
        if not value:
            continue
        try:
            return parsedate_to_datetime(value)
        except Exception:
            pass
    published_parsed = entry.get("published_parsed") or entry.get("updated_parsed")
    if published_parsed:
        return datetime(*published_parsed[:6], tzinfo=timezone.utc)
    return None


def _extract_snippet(entry: Dict[str, Any], max_chars: int = 500) -> str:
    """エントリから冒頭テキストを抽出"""
    summary = entry.get("summary", "")
    # HTMLタグを簡易除去
    import re
    text = re.sub(r"<[^>]+>", "", summary)
    return text[:max_chars].strip()


def fetch_articles(source: str, url: str) -> List[Dict[str, Any]]:
    """指定RSSフィードから記事を取得してdictリストで返す"""
    logger.info(f"Fetching RSS: {source} ({url})")
    try:
        feed = feedparser.parse(url)
    except Exception as e:
        logger.error(f"Failed to parse RSS {url}: {e}")
        return []

    articles = []
    for entry in feed.entries:
        article_url = entry.get("link", "")
        if not article_url:
            continue

        articles.append({
            "title": entry.get("title", "No title"),
            "url": article_url,
            "source": source,
            "author": entry.get("author", ""),
            "published_at": _parse_date(entry),
            "content_snippet": _extract_snippet(entry),
        })

    logger.info(f"Fetched {len(articles)} articles from {source}")
    return articles


MAX_ARTICLES = 50

def fetch_all_articles(preferred_tags: str = "", custom_feeds: list = None) -> List[Dict[str, Any]]:
    """全RSSフィードから記事を並列取得。preferred_tags を優先しつつ合計50件に制限"""
    # 優先順でフィードリストを構築（インデックスで順序を保持）
    feeds_to_fetch: List[tuple[str, str]] = []

    if preferred_tags:
        tags = [t.strip() for t in preferred_tags.split(",") if t.strip()]
        for tag in tags:
            slug = TAG_SLUGS.get(tag)
            if not slug:
                continue
            feeds_to_fetch.append(("zenn",  f"https://zenn.dev/topics/{slug}/feed"))
            feeds_to_fetch.append(("qiita", f"https://qiita.com/tags/{slug}/feed"))

    for source, url in RSS_FEEDS.items():
        feeds_to_fetch.append((source, url))

    if custom_feeds:
        for feed in custom_feeds:
            feeds_to_fetch.append((feed["name"], feed["url"]))

    # 全フィードを並列取得（順序はインデックスで保持）
    results: List[List[Dict[str, Any]]] = [[] for _ in feeds_to_fetch]
    max_workers = min(10, len(feeds_to_fetch)) if feeds_to_fetch else 1
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_idx = {
            executor.submit(fetch_articles, source, url): i
            for i, (source, url) in enumerate(feeds_to_fetch)
        }
        for future in as_completed(future_to_idx):
            results[future_to_idx[future]] = future.result()

    # 優先順で重複除去しながらマージ
    all_articles: List[Dict[str, Any]] = []
    seen_urls: set[str] = set()
    for articles in results:
        for a in articles:
            if len(all_articles) >= MAX_ARTICLES:
                return all_articles
            if a["url"] not in seen_urls:
                seen_urls.add(a["url"])
                all_articles.append(a)

    return all_articles
