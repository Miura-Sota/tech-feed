import React, { useState, useEffect, useCallback, useMemo } from "react";
import TodaysPicks from "./components/TodaysPicks";
import ArticleList from "./components/ArticleList";
import SettingsPanel from "./components/SettingsPanel";
import AuthPage from "./components/AuthPage";
import { apiFetch, logout, getToken } from "./api";

const LS_READ = "tech-feed:read";
const LS_USER = "tech-feed:user";

function loadStoredUser() {
  try {
    const raw = localStorage.getItem(LS_USER);
    if (raw && getToken()) return JSON.parse(raw);
  } catch {}
  return null;
}

export default function App() {
  const [authUser, setAuthUser] = useState(() => loadStoredUser());
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
  const [bookmarkedArticles, setBookmarkedArticles] = useState([]);
  const [preferences, setPreferences] = useState({ preferred_tags: "", preferred_keywords: "" });
  const [tagFilterMode, setTagFilterMode] = useState(() =>
    localStorage.getItem("tech-feed:tagFilterMode") ?? "or"
  );

  const handleAuth = useCallback((userData) => {
    setAuthUser(userData);
    localStorage.setItem(LS_USER, JSON.stringify(userData));
    // reset state for new user
    setArticles([]);
    setReadIds(new Set());
    setBookmarkedArticles([]);
    setPreferences({ preferred_tags: "", preferred_keywords: "" });
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    localStorage.removeItem(LS_USER);
    localStorage.removeItem(LS_READ);
    setAuthUser(null);
    setArticles([]);
    setReadIds(new Set());
    setBookmarkedArticles([]);
  }, []);

  // 401 イベントで自動ログアウト
  useEffect(() => {
    const onAuthLogout = () => handleLogout();
    window.addEventListener("auth:logout", onAuthLogout);
    return () => window.removeEventListener("auth:logout", onAuthLogout);
  }, [handleLogout]);

  const handleTagFilterModeChange = useCallback((mode) => {
    setTagFilterMode(mode);
    localStorage.setItem("tech-feed:tagFilterMode", mode);
  }, []);

  const loadTodayArticles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/articles/today");
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
    if (!authUser) return;
    loadTodayArticles();
  }, [authUser, loadTodayArticles]);

  useEffect(() => {
    if (!authUser) return;
    apiFetch("/settings/preferences")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setPreferences(data); })
      .catch(() => {});
  }, [authUser]);

  useEffect(() => {
    if (!authUser) return;
    apiFetch("/read-marks/")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        const ids = new Set(data.map((r) => r.article_id));
        setReadIds(ids);
        localStorage.setItem(LS_READ, JSON.stringify([...ids]));
      })
      .catch(() => {});
  }, [authUser]);

  useEffect(() => {
    if (!authUser) return;
    apiFetch("/bookmarks/")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setBookmarkedArticles(data))
      .catch(() => {});
  }, [authUser]);

  const handleSavePreferences = useCallback(async (prefs) => {
    const res = await apiFetch("/settings/preferences", {
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

  const preferredKeywordSet = useMemo(() => {
    if (!preferences.preferred_keywords) return new Set();
    return new Set(preferences.preferred_keywords.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean));
  }, [preferences.preferred_keywords]);

  const handleFetch = async () => {
    setFetching(true);
    try {
      const res = await apiFetch("/articles/fetch", { method: "POST" });
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
      apiFetch(`/read-marks/${id}`, { method: "POST" }).catch(() => {});
      localStorage.setItem(LS_READ, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const handleBookmark = useCallback((article) => {
    setBookmarkedArticles((prev) => {
      const isCurrentlyBookmarked = prev.some((a) => a.id === article.id);
      if (isCurrentlyBookmarked) {
        apiFetch(`/bookmarks/${article.id}`, { method: "DELETE" }).catch(() => {});
        return prev.filter((a) => a.id !== article.id);
      } else {
        apiFetch(`/bookmarks/${article.id}`, { method: "POST" }).catch(() => {});
        return [...prev, article];
      }
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

  const baseArticles = useMemo(() => {
    if (preferredTagSet.size === 0) return articles;
    return articles.filter((a) => {
      const articleTags = a.tags?.split(",").map((t) => t.trim()) ?? [];
      if (tagFilterMode === "and") {
        return [...preferredTagSet].every((t) => articleTags.includes(t));
      }
      return articleTags.some((t) => preferredTagSet.has(t));
    });
  }, [articles, preferredTagSet, tagFilterMode]);

  const filteredArticles = useMemo(() => {
    if (selectedTag) {
      return baseArticles.filter((a) =>
        a.tags?.split(",").map((t) => t.trim()).includes(selectedTag)
      );
    }
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      return baseArticles.filter(
        (a) =>
          a.title?.toLowerCase().includes(q) ||
          a.summary?.toLowerCase().includes(q) ||
          a.tags?.toLowerCase().includes(q)
      );
    }
    return baseArticles;
  }, [baseArticles, selectedTag, searchText]);

  const isFiltering = selectedTag || searchText.trim();

  const today = new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  // 未認証時は AuthPage を表示
  if (!authUser) {
    return <AuthPage onAuth={handleAuth} />;
  }

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
            <span style={{ fontSize: 12, color: "#64748b" }}>{authUser.email}</span>
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
            {authUser.is_admin && (
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
            )}
            <button
              onClick={handleLogout}
              style={{
                background: "transparent",
                border: "1px solid #475569",
                color: "#94a3b8",
                borderRadius: 8,
                padding: "8px 16px",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              ログアウト
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
            { key: "today", label: "今日のおすすめ" },
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
          <SettingsPanel
            preferences={preferences}
            onSave={handleSavePreferences}
            tagFilterMode={tagFilterMode}
            onTagFilterModeChange={handleTagFilterModeChange}
          />
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
              preferredKeywordSet={preferredKeywordSet}
            />
          </>
        ) : (
          <>
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
                    {preferredTagSet.size > 0 && (
                      <span style={{ color: "#0e7490", fontWeight: 600 }}>
                        好みタグでフィルター中: {baseArticles.length}/{articles.length}件
                      </span>
                    )}
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
                preferredKeywordSet={preferredKeywordSet}
              />
            ) : (
              <>
                <TodaysPicks
                  articles={baseArticles}
                  onTagClick={handleTagClick}
                  selectedTag={selectedTag}
                  readIds={readIds}
                  bookmarkedIds={bookmarkedIds}
                  onRead={handleRead}
                  onBookmark={handleBookmark}
                  preferredTagSet={preferredTagSet}
                  preferredKeywordSet={preferredKeywordSet}
                />
                <ArticleList
                  articles={baseArticles}
                  onTagClick={handleTagClick}
                  selectedTag={selectedTag}
                  readIds={readIds}
                  bookmarkedIds={bookmarkedIds}
                  onRead={handleRead}
                  onBookmark={handleBookmark}
                  preferredTagSet={preferredTagSet}
                  preferredKeywordSet={preferredKeywordSet}
                />
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
