import React, { useState, useEffect } from "react";
import { apiFetch } from "../api";

const ALL_TAGS = [
  "React", "Vue", "TypeScript", "Python", "Go", "Rust",
  "インフラ", "AWS", "Docker", "Kubernetes", "セキュリティ", "AI/ML",
  "データベース", "API", "フロントエンド", "バックエンド", "DevOps",
  "パフォーマンス", "テスト", "設計",
];

export default function SettingsPanel({ preferences, onSave, tagFilterMode, onTagFilterModeChange, isAdmin }) {
  const [selectedTags, setSelectedTags] = useState(new Set());
  const [keywords, setKeywords] = useState("");
  const [saveMsg, setSaveMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  // カスタムフィード
  const [feeds, setFeeds] = useState([]);
  const [newFeedName, setNewFeedName] = useState("");
  const [newFeedUrl, setNewFeedUrl] = useState("");
  const [feedMsg, setFeedMsg] = useState(null);

  useEffect(() => {
    if (preferences) {
      const tags = preferences.preferred_tags
        ? new Set(preferences.preferred_tags.split(",").map((t) => t.trim()).filter(Boolean))
        : new Set();
      setSelectedTags(tags);
      setKeywords(preferences.preferred_keywords ?? "");
    }
  }, [preferences]);

  useEffect(() => {
    apiFetch("/settings/feeds")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setFeeds(data))
      .catch(() => {});
  }, []);

  const handleAddFeed = async () => {
    if (!newFeedName.trim() || !newFeedUrl.trim()) return;
    try {
      const res = await apiFetch("/settings/feeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFeedName.trim(), url: newFeedUrl.trim() }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const feed = await res.json();
      setFeeds((prev) => [...prev, feed]);
      setNewFeedName("");
      setNewFeedUrl("");
      setFeedMsg("追加しました");
    } catch {
      setFeedMsg("追加に失敗しました");
    } finally {
      setTimeout(() => setFeedMsg(null), 3000);
    }
  };

  const handleDeleteFeed = async (id) => {
    await apiFetch(`/settings/feeds/${id}`, { method: "DELETE" }).catch(() => {});
    setFeeds((prev) => prev.filter((f) => f.id !== id));
  };

  const handleToggleFeed = async (id) => {
    const res = await apiFetch(`/settings/feeds/${id}`, { method: "PATCH" }).catch(() => null);
    if (res && res.ok) {
      const updated = await res.json();
      setFeeds((prev) => prev.map((f) => f.id === id ? updated : f));
    }
  };

  const toggleTag = (tag) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const handleClearAll = async () => {
    setSelectedTags(new Set());
    setKeywords('');
    onTagFilterModeChange('or');
    setSaving(true);
    setSaveMsg(null);
    try {
      await onSave({ preferred_tags: '', preferred_keywords: '' });
      setSaveMsg('クリアしました');
    } catch {
      setSaveMsg('保存に失敗しました');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 3000);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    const payload = {
      preferred_tags: [...selectedTags].join(","),
      preferred_keywords: keywords,
    };
    try {
      await onSave(payload);
      setSaveMsg("保存しました");
    } catch {
      setSaveMsg("保存に失敗しました");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 3000);
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1a1a2e", marginBottom: 20 }}>
        {isAdmin ? "好みのタグ・キーワード設定" : "設定"}
      </h2>

      {isAdmin && (
      <>
      {/* タグチェックボックス */}
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: "20px 24px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "#334155", margin: 0 }}>
            好みのタグ
          </h3>
          <button
            onClick={handleClearAll}
            disabled={saving || (selectedTags.size === 0 && !keywords)}
            style={{
              background: 'none',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              padding: '3px 10px',
              fontSize: 12,
              color: selectedTags.size === 0 && !keywords ? '#94a3b8' : '#64748b',
              cursor: selectedTags.size === 0 && !keywords ? 'not-allowed' : 'pointer',
            }}
          >
            すべてクリア
          </button>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
            gap: 8,
          }}
        >
          {ALL_TAGS.map((tag) => {
            const checked = selectedTags.has(tag);
            return (
              <label
                key={tag}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: `1px solid ${checked ? "#3ea8ff" : "#e2e8f0"}`,
                  background: checked ? "#eff8ff" : "#f8fafc",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: checked ? 600 : 400,
                  color: checked ? "#0e7490" : "#475569",
                  transition: "all 0.15s",
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleTag(tag)}
                  style={{ accentColor: "#3ea8ff" }}
                />
                {tag}
              </label>
            );
          })}
        </div>
      </div>

      {/* OR/AND トグル */}
      {selectedTags.size > 0 && (
        <div
          style={{
            background: "#f0f9ff",
            border: "1px solid #bae6fd",
            borderRadius: 10,
            padding: "14px 20px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: "#0369a1" }}>フィルター条件:</span>
          {[
            { value: "or", label: "OR（いずれかのタグ）" },
            { value: "and", label: "AND（すべてのタグ）" },
          ].map(({ value, label }) => (
            <label
              key={value}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                color: tagFilterMode === value ? "#0e7490" : "#475569",
                fontWeight: tagFilterMode === value ? 700 : 400,
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name="tagFilterMode"
                value={value}
                checked={tagFilterMode === value}
                onChange={() => onTagFilterModeChange(value)}
                style={{ accentColor: "#3ea8ff" }}
              />
              {label}
            </label>
          ))}
        </div>
      )}

      {/* キーワード入力 */}
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: "20px 24px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          marginBottom: 24,
        }}
      >
        <h3 style={{ fontSize: 15, fontWeight: 600, color: "#334155", marginBottom: 8 }}>
          フリーキーワード
        </h3>
        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
          カンマ区切りで入力してください（例: Next.js, GraphQL, Wasm）
        </p>
        <input
          type="text"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="キーワードをカンマ区切りで入力..."
          style={{
            width: "100%",
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            fontSize: 14,
            outline: "none",
            boxSizing: "border-box",
            color: "#1e293b",
          }}
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: saving ? "#94a3b8" : "#3ea8ff",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "10px 28px",
            fontSize: 14,
            fontWeight: 700,
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "保存中..." : "保存"}
        </button>
        {saveMsg && (
          <span
            style={{
              fontSize: 14,
              color: saveMsg === "保存しました" ? "#16a34a" : "#dc2626",
              fontWeight: 600,
            }}
          >
            {saveMsg}
          </span>
        )}
      </div>
      </>
      )}

      {/* カスタムフィード */}
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: "20px 24px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          marginBottom: 24,
        }}
      >
        <h3 style={{ fontSize: 15, fontWeight: 600, color: "#334155", marginBottom: 14 }}>
          カスタムRSSフィード
        </h3>

        {/* 登録済みフィード一覧 */}
        {feeds.length === 0 ? (
          <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 16 }}>
            カスタムフィードは登録されていません。
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {feeds.map((feed) => (
              <div
                key={feed.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: `1px solid ${feed.is_active ? "#cbd5e1" : "#e2e8f0"}`,
                  background: feed.is_active ? "#f8fafc" : "#f1f5f9",
                  opacity: feed.is_active ? 1 : 0.6,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b", marginBottom: 2 }}>
                    {feed.name}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {feed.url}
                  </div>
                </div>
                <button
                  onClick={() => handleToggleFeed(feed.id)}
                  title={feed.is_active ? "無効化" : "有効化"}
                  style={{
                    background: feed.is_active ? "#dcfce7" : "#f1f5f9",
                    color: feed.is_active ? "#16a34a" : "#64748b",
                    border: `1px solid ${feed.is_active ? "#86efac" : "#cbd5e1"}`,
                    borderRadius: 6,
                    padding: "3px 10px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {feed.is_active ? "有効" : "無効"}
                </button>
                <button
                  onClick={() => handleDeleteFeed(feed.id)}
                  title="削除"
                  style={{
                    background: "#fee2e2",
                    color: "#dc2626",
                    border: "1px solid #fca5a5",
                    borderRadius: 6,
                    padding: "3px 10px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  削除
                </button>
              </div>
            ))}
          </div>
        )}

        {/* フィード追加フォーム */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            type="text"
            value={newFeedName}
            onChange={(e) => setNewFeedName(e.target.value)}
            placeholder="名前（例: Cloudflare Blog）"
            style={{
              flex: "1 1 160px",
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              fontSize: 13,
              outline: "none",
            }}
          />
          <input
            type="url"
            value={newFeedUrl}
            onChange={(e) => setNewFeedUrl(e.target.value)}
            placeholder="RSS URL"
            style={{
              flex: "2 1 240px",
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              fontSize: 13,
              outline: "none",
            }}
          />
          <button
            onClick={handleAddFeed}
            disabled={!newFeedName.trim() || !newFeedUrl.trim()}
            style={{
              background: newFeedName.trim() && newFeedUrl.trim() ? "#3ea8ff" : "#94a3b8",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "8px 18px",
              fontSize: 13,
              fontWeight: 600,
              cursor: newFeedName.trim() && newFeedUrl.trim() ? "pointer" : "not-allowed",
            }}
          >
            追加
          </button>
        </div>
        {feedMsg && (
          <p style={{ fontSize: 13, color: feedMsg.includes("失敗") ? "#dc2626" : "#16a34a", marginTop: 8, fontWeight: 600 }}>
            {feedMsg}
          </p>
        )}
      </div>
    </div>
  );
}
