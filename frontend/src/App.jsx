import React, { useState, useEffect, useCallback } from "react";
import TodaysPicks from "./components/TodaysPicks";
import ArticleList from "./components/ArticleList";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export default function App() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadTodayArticles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/articles/today`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setArticles(data);
      setLastUpdated(new Date());
    } catch (e) {
      setError(`記事の取得に失敗しました: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTodayArticles();
  }, [loadTodayArticles]);

  const handleFetch = async () => {
    setFetching(true);
    try {
      const res = await fetch(`${API_BASE}/articles/fetch`, { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // バックグラウンド処理なので少し待ってからリロード
      setTimeout(() => {
        loadTodayArticles();
        setFetching(false);
      }, 3000);
    } catch (e) {
      setError(`フェッチのトリガーに失敗しました: ${e.message}`);
      setFetching(false);
    }
  };

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

        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#64748b" }}>
            <p style={{ fontSize: 16 }}>記事を読み込み中...</p>
          </div>
        ) : (
          <>
            {/* 統計バー */}
            {articles.length > 0 && (
              <div
                style={{
                  background: "#fff",
                  borderRadius: 10,
                  padding: "14px 20px",
                  marginBottom: 28,
                  display: "flex",
                  gap: 24,
                  fontSize: 14,
                  color: "#555",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                }}
              >
                <span>今日の記事: <strong>{articles.length}</strong> 件</span>
                <span>Zenn: <strong>{articles.filter((a) => a.source === "zenn").length}</strong></span>
                <span>Qiita: <strong>{articles.filter((a) => a.source === "qiita").length}</strong></span>
                <span>おすすめ: <strong>{articles.filter((a) => a.is_picked).length}</strong></span>
              </div>
            )}

            <TodaysPicks articles={articles} />
            <ArticleList articles={articles} />
          </>
        )}
      </main>
    </div>
  );
}
