import React, { useState, useEffect } from "react";
import ArticleCard from "./ArticleCard";

const PAGE_SIZE = 50;

const DEFAULT_EMPTY_ADMIN = "記事がありません。「今すぐ取得」ボタンで記事を取得してください。";
const DEFAULT_EMPTY_GUEST = "記事はまだありません。毎朝7時に自動取得されます。";

export default function ArticleList({ articles, onTagClick, selectedTag, showAll, readIds, bookmarkedIds, onRead, onBookmark, emptyMessage, isAdmin, preferredTagSet, preferredKeywordSet }) {
  const nonPicked = showAll ? articles : articles.filter((a) => !a.is_picked);
  const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE);

  // 記事が切り替わったら表示上限をリセット
  useEffect(() => {
    setDisplayLimit(PAGE_SIZE);
  }, [articles]);

  const visible = nonPicked.slice(0, displayLimit);
  const hasMore = nonPicked.length > displayLimit;

  if (nonPicked.length === 0) {
    return (
      <p style={{ color: "#888", textAlign: "center", padding: 32 }}>
        {emptyMessage ?? (isAdmin ? DEFAULT_EMPTY_ADMIN : DEFAULT_EMPTY_GUEST)}
      </p>
    );
  }

  return (
    <section>
      {!showAll && (
        <h2
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "#1a1a2e",
            marginBottom: 16,
          }}
        >
          その他の記事 ({nonPicked.length} 件)
        </h2>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {visible.map((article) => {
          const isTagMatched = preferredTagSet?.size > 0 &&
            article.tags?.split(",").map((t) => t.trim()).some((t) => preferredTagSet.has(t));
          const isKeywordMatched = preferredKeywordSet?.size > 0 && (() => {
            const text = `${article.title ?? ""} ${article.summary ?? ""} ${article.tags ?? ""}`.toLowerCase();
            return [...preferredKeywordSet].some((kw) => text.includes(kw));
          })();
          const isPreferred = isTagMatched || isKeywordMatched;
          return (
            <ArticleCard
              key={article.id}
              article={article}
              onTagClick={onTagClick}
              selectedTag={selectedTag}
              isRead={readIds?.has(article.id)}
              isBookmarked={bookmarkedIds?.has(article.id)}
              onRead={onRead}
              onBookmark={onBookmark}
              isPreferred={isPreferred}
            />
          );
        })}
      </div>
      {hasMore && (
        <button
          onClick={() => setDisplayLimit((prev) => prev + PAGE_SIZE)}
          style={{
            display: "block",
            margin: "24px auto 0",
            background: "#f1f5f9",
            border: "1px solid #cbd5e1",
            borderRadius: 8,
            padding: "10px 32px",
            fontSize: 14,
            color: "#475569",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          もっと見る（残り {nonPicked.length - displayLimit} 件）
        </button>
      )}
    </section>
  );
}
