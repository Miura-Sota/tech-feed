import feedparser
import logging
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


def fetch_all_articles(preferred_tags: str = "") -> List[Dict[str, Any]]:
    """全RSSフィードから記事を取得。preferred_tags が設定されていればタグ別フィードも追加取得"""
    all_articles = []
    seen_urls = set()

    def add_articles(articles):
        for a in articles:
            if a["url"] not in seen_urls:
                seen_urls.add(a["url"])
                all_articles.append(a)

    # 通常フィード
    for source, url in RSS_FEEDS.items():
        add_articles(fetch_articles(source, url))

    # 好みタグのフィードを追加取得
    if preferred_tags:
        tags = [t.strip() for t in preferred_tags.split(",") if t.strip()]
        for tag in tags:
            slug = TAG_SLUGS.get(tag)
            if not slug:
                continue
            add_articles(fetch_articles("zenn",  f"https://zenn.dev/topics/{slug}/feed"))
            add_articles(fetch_articles("qiita", f"https://qiita.com/tags/{slug}/feed"))

    return all_articles
