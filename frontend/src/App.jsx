import React, { useState, useEffect, useCallback, useMemo } from "react";
import TodaysPicks from "./components/TodaysPicks";
import ArticleList from "./components/ArticleList";
import SettingsPanel from "./components/SettingsPanel";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

const LS_READ = "tech-feed:read";
const LS_BOOKMARKS = "tech-feed:bookmarks";

export default function App() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [selectedTag, setSelectedTag] = useState(null);
  const [activeTab, setActiveTab] = useState("today");
  const [readIds, setReadIds] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(LS_READ) ?? "[]");
      return new Set(stored);
    } catch { return new Set(); }
  });
  const [bookmarkedArticles, setBookmarkedArticles] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_BOOKMARKS) ?? "[]");
    } catch { return []; }
  });
  const [preferences, setPreferences] = useState({ preferred_tags: "", preferred_keywords: "" });

  const loadTodayArticles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/articles/today`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setArticles(data);
      setLastUpdated(new Date());
      return data;
    } catch (e) {
      setError(`記事の取得に失敗しました: ${e.message}`);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTodayArticles();
  }, [loadTodayArticles]);

  useEffect(() => {
    fetch(`${API_BASE}/settings/preferences`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setPreferences(data); })
      .catch(() => {});
  }, []);

  const handleSavePreferences = useCallback(async (prefs) => {
    const res = await fetch(`${API_BASE}/settings/preferences`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prefs),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    setPreferences(data);
  }, []);

  const preferredTagSet = useMemo(() => {
    if (!preferences.preferred_tags) return new Set();
    return new Set(preferences.preferred_tags.split(",").map((t) => t.trim()).filter(Boolean));
  }, [preferences.preferred_tags]);

  const handleFetch = async () => {
    setFetching(true);
    try {
      const res = await fetch(`${API_BASE}/articles/fetch`, { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const startTime = Date.now();
      const poll = async () => {
        if (Date.now() - startTime > 120000) {
          setFetching(false);
          return;
        }
        await new Promise((r) => setTimeout(r, 5000));
        const data = await loadTodayArticles();
        if (data.some((a) => a.is_picked)) {
          setFetching(false);
        } else {
          poll();
        }
      };
      poll();
    } catch (e) {
      setError(`フェッチのトリガーに失敗しました: ${e.message}`);
      setFetching(false);
    }
  };

  const handleRead = useCallback((id) => {
    setReadIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem(LS_READ, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const handleBookmark = useCallback((article) => {
    setBookmarkedArticles((prev) => {
      const exists = prev.some((a) => a.id === article.id);
      const next = exists ? prev.filter((a) => a.id !== article.id) : [...prev, article];
      localStorage.setItem(LS_BOOKMARKS, JSON.stringify(next));
      return next;
    });
  }, []);

  const bookmarkedIds = useMemo(() => new Set(bookmarkedArticles.map((a) => a.id)), [bookmarkedArticles]);

  const handleTagClick = (tag) => {
    setSelectedTag((prev) => (prev === tag ? null : tag));
    setSearchText("");
  };

  const handleSearchChange = (e) => {
    setSearchText(e.target.value);
    setSelectedTag(null);
  };

  const filteredArticles = useMemo(() => {
    if (selectedTag) {
      return articles.filter((a) =>
        a.tags?.split(",").map((t) => t.trim()).includes(selectedTag)
      );
    }
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      return articles.filter(
        (a) =>
          a.title?.toLowerCase().includes(q) ||
          a.summary?.toLowerCase().includes(q) ||
          a.tags?.toLowerCase().includes(q)
      );
    }
    return articles;
  }, [articles, selectedTag, searchText]);

  const isFiltering = selectedTag || searchText.trim();

  const today = new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f0f2f5" }}>
      {/* ヘッダー */}
      <header
        style={{
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
          color: "#fff",
          padding: "24px 0",
          marginBottom: 32,
        }}
      >
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            padding: "0 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px" }}>
              Tech Feed
            </h1>
            <p style={{ fontSize: 14, color: "#94a3b8", marginTop: 4 }}>
              {today} の技術まとめ
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {lastUpdated && (
              <span style={{ fontSize: 12, color: "#64748b" }}>
                更新: {lastUpdated.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <button
              onClick={loadTodayArticles}
              disabled={loading}
              style={{
                background: "transparent",
                border: "1px solid #475569",
                color: "#94a3b8",
                borderRadius: 8,
                padding: "8px 16px",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: 14,
              }}
            >
              {loading ? "読込中..." : "更新"}
            </button>
            <button
              onClick={handleFetch}
              disabled={fetching}
              style={{
                background: fetching ? "#475569" : "#3ea8ff",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "8px 18px",
                cursor: fetching ? "not-allowed" : "pointer",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {fetching ? "取得中..." : "今すぐ取得"}
            </button>
          </div>
        </div>

        {/* 検索バー */}
        <div style={{ maxWidth: 900, margin: "16px auto 0", padding: "0 24px" }}>
          <input
            type="text"
            placeholder="タイトル・要約・タグで検索..."
            value={searchText}
            onChange={handleSearchChange}
            style={{
              width: "100%",
              padding: "10px 16px",
              borderRadius: 8,
              border: "1px solid #334155",
              background: "#1e293b",
              color: "#f1f5f9",
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* タブ */}
        <div style={{ maxWidth: 900, margin: "12px auto 0", padding: "0 24px", display: "flex", gap: 4 }}>
          {[
            { key: "today", label: "今日" },
            { key: "bookmarks", label: `ブックマーク ${bookmarkedArticles.length}件` },
            { key: "settings", label: preferredTagSet.size > 0 ? "設定 ⚙ ✓" : "設定 ⚙" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                background: activeTab === key ? "#3ea8ff" : "transparent",
                color: activeTab === key ? "#fff" : "#94a3b8",
                border: activeTab === key ? "none" : "1px solid #475569",
                borderRadius: 8,
                padding: "6px 16px",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: activeTab === key ? 700 : 400,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* メインコンテンツ */}
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 48px" }}>
        {error && (
          <div
            style={{
              background: "#fee2e2",
              border: "1px solid #fca5a5",
              borderRadius: 8,
              padding: "12px 16px",
              color: "#dc2626",
              marginBottom: 24,
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        {activeTab === "settings" ? (
          <SettingsPanel preferences={preferences} onSave={handleSavePreferences} />
        ) : loading && activeTab === "today" ? (
          <div style={{ textAlign: "center", padding: 60, color: "#64748b" }}>
            <p style={{ fontSize: 16 }}>記事を読み込み中...</p>
          </div>
        ) : activeTab === "bookmarks" ? (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1a1a2e", marginBottom: 20 }}>
              ブックマーク ({bookmarkedArticles.length} 件)
            </h2>
            <ArticleList
              articles={bookmarkedArticles}
              onTagClick={handleTagClick}
              selectedTag={selectedTag}
              showAll
              readIds={readIds}
              bookmarkedIds={bookmarkedIds}
              onRead={handleRead}
              onBookmark={handleBookmark}
              emptyMessage="ブックマークがありません。記事の☆ボタンで追加できます。"
              preferredTagSet={preferredTagSet}
            />
          </>
        ) : (
          <>
            {/* 統計バー / フィルター表示 */}
            {articles.length > 0 && (
              <div
                style={{
                  background: "#fff",
                  borderRadius: 10,
                  padding: "14px 20px",
                  marginBottom: 28,
                  display: "flex",
                  gap: 16,
                  fontSize: 14,
                  color: "#555",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                {isFiltering ? (
                  <>
                    <span>
                      {selectedTag ? `タグ: ` : `検索: `}
                      <strong>{selectedTag || searchText}</strong>
                      {` → ${filteredArticles.length}件`}
                    </span>
                    <button
                      onClick={() => { setSelectedTag(null); setSearchText(""); }}
                      style={{
                        background: "#f1f5f9",
                        border: "1px solid #cbd5e1",
                        borderRadius: 6,
                        padding: "2px 10px",
                        fontSize: 12,
                        cursor: "pointer",
                        color: "#475569",
                      }}
                    >
                      クリア
                    </button>
                  </>
                ) : (
                  <>
                    <span>今日の記事: <strong>{articles.length}</strong> 件</span>
                    <span>Zenn: <strong>{articles.filter((a) => a.source === "zenn").length}</strong></span>
                    <span>Qiita: <strong>{articles.filter((a) => a.source === "qiita").length}</strong></span>
                    <span>おすすめ: <strong>{articles.filter((a) => a.is_picked).length}</strong></span>
                  </>
                )}
              </div>
            )}

            {isFiltering ? (
              <ArticleList
                articles={filteredArticles}
                onTagClick={handleTagClick}
                selectedTag={selectedTag}
                showAll
                readIds={readIds}
                bookmarkedIds={bookmarkedIds}
                onRead={handleRead}
                onBookmark={handleBookmark}
                preferredTagSet={preferredTagSet}
              />
            ) : (
              <>
                <TodaysPicks
                  articles={articles}
                  onTagClick={handleTagClick}
                  selectedTag={selectedTag}
                  readIds={readIds}
                  bookmarkedIds={bookmarkedIds}
                  onRead={handleRead}
                  onBookmark={handleBookmark}
                  preferredTagSet={preferredTagSet}
                />
                <ArticleList
                  articles={articles}
                  onTagClick={handleTagClick}
                  selectedTag={selectedTag}
                  readIds={readIds}
                  bookmarkedIds={bookmarkedIds}
                  onRead={handleRead}
                  onBookmark={handleBookmark}
                  preferredTagSet={preferredTagSet}
                />
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
