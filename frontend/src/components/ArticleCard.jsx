import React from "react";

const SOURCE_COLORS = {
  zenn: { bg: "#e8f4fd", border: "#3ea8ff", text: "#1a6fa8" },
  qiita: { bg: "#e8fde8", border: "#55c500", text: "#2d7a00" },
};

const TAG_COLORS = [
  "#e3f2fd", "#fce4ec", "#f3e5f5", "#e8f5e9", "#fff3e0",
  "#e0f2f1", "#fff9c4", "#ede7f6",
];

function tagColor(tag) {
  let hash = 0;
  for (const c of tag) hash = (hash * 31 + c.charCodeAt(0)) & 0xff;
  return TAG_COLORS[hash % TAG_COLORS.length];
}

export default function ArticleCard({ article, onTagClick, selectedTag, isRead, isBookmarked, onRead, onBookmark }) {
  const src = SOURCE_COLORS[article.source] ?? { bg: "#f5f5f5", border: "#999", text: "#555" };
  const tags = article.tags ? article.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];

  return (
    <article
      style={{
        background: "#fff",
        borderRadius: 12,
        padding: "18px 20px",
        borderLeft: `4px solid ${src.border}`,
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        opacity: isRead ? 0.5 : 1,
        position: "relative",
      }}
    >
      {/* ブックマークボタン */}
      <button
        onClick={() => onBookmark?.(article)}
        title={isBookmarked ? "ブックマーク解除" : "ブックマーク"}
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: 20,
          lineHeight: 1,
          padding: 2,
          color: isBookmarked ? "#f59e0b" : "#cbd5e1",
        }}
      >
        {isBookmarked ? "★" : "☆"}
      </button>

      {/* ソースバッジ + おすすめバッジ + 読済バッジ */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span
          style={{
            background: src.bg,
            color: src.text,
            border: `1px solid ${src.border}`,
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            padding: "2px 8px",
            textTransform: "capitalize",
          }}
        >
          {article.source}
        </span>
        {article.is_picked && (
          <span
            style={{
              background: "#fff8e1",
              color: "#f59e0b",
              border: "1px solid #fbbf24",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              padding: "2px 8px",
            }}
          >
            ★ おすすめ
          </span>
        )}
        {isRead && (
          <span
            style={{
              background: "#f1f5f9",
              color: "#94a3b8",
              border: "1px solid #cbd5e1",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              padding: "2px 8px",
            }}
          >
            読済
          </span>
        )}
      </div>

      {/* タイトル */}
      <h3 style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.4, paddingRight: 28 }}>
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#1a1a2e" }}
          onMouseOver={(e) => (e.currentTarget.style.color = "#3ea8ff")}
          onMouseOut={(e) => (e.currentTarget.style.color = "#1a1a2e")}
          onClick={() => onRead?.(article.id)}
        >
          {article.title}
        </a>
      </h3>

      {/* AI要約 */}
      {article.summary && (
        <p style={{ fontSize: 14, color: "#555", lineHeight: 1.6 }}>
          {article.summary}
        </p>
      )}

      {/* タグ */}
      {tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {tags.map((tag) => (
            <span
              key={tag}
              onClick={() => onTagClick?.(tag)}
              style={{
                background: selectedTag === tag ? "#3ea8ff" : tagColor(tag),
                color: selectedTag === tag ? "#fff" : "#333",
                borderRadius: 20,
                fontSize: 12,
                padding: "2px 10px",
                cursor: onTagClick ? "pointer" : "default",
                transition: "background 0.15s",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* 著者・日時 */}
      <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
        {article.author && <span>{article.author} · </span>}
        {article.published_at && (
          <span>
            {new Date(article.published_at).toLocaleDateString("ja-JP", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
        )}
      </div>
    </article>
  );
}
