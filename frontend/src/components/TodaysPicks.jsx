import React from "react";
import ArticleCard from "./ArticleCard";

export default function TodaysPicks({ articles, onTagClick, selectedTag, readIds, bookmarkedIds, onRead, onBookmark, preferredTagSet, preferredKeywordSet }) {
  const picks = articles.filter((a) => a.is_picked);

  if (picks.length === 0) return null;

  return (
    <section style={{ marginBottom: 40 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <span style={{ fontSize: 24 }}>★</span>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1a1a2e" }}>
          今日のおすすめ {picks.length} 本
        </h2>
      </div>
      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
        }}
      >
        {picks.map((article) => {
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
    </section>
  );
}
