import React from "react";
import ArticleCard from "./ArticleCard";

export default function ArticleList({ articles, onTagClick, selectedTag, showAll }) {
  const nonPicked = showAll ? articles : articles.filter((a) => !a.is_picked);

  if (nonPicked.length === 0) {
    return (
      <p style={{ color: "#888", textAlign: "center", padding: 32 }}>
        記事がありません。「今すぐ取得」ボタンで記事を取得してください。
      </p>
    );
  }

  return (
    <section>
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
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {nonPicked.map((article) => (
          <ArticleCard key={article.id} article={article} onTagClick={onTagClick} selectedTag={selectedTag} />
        ))}
      </div>
    </section>
  );
}
