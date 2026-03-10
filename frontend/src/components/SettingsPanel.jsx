import React, { useState, useEffect } from "react";

const ALL_TAGS = [
  "React", "Vue", "TypeScript", "Python", "Go", "Rust",
  "インフラ", "AWS", "Docker", "Kubernetes", "セキュリティ", "AI/ML",
  "データベース", "API", "フロントエンド", "バックエンド", "DevOps",
  "パフォーマンス", "テスト", "設計",
];

export default function SettingsPanel({ preferences, onSave }) {
  const [selectedTags, setSelectedTags] = useState(new Set());
  const [keywords, setKeywords] = useState("");
  const [saveMsg, setSaveMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (preferences) {
      const tags = preferences.preferred_tags
        ? new Set(preferences.preferred_tags.split(",").map((t) => t.trim()).filter(Boolean))
        : new Set();
      setSelectedTags(tags);
      setKeywords(preferences.preferred_keywords ?? "");
    }
  }, [preferences]);

  const toggleTag = (tag) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
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
        好みのタグ・キーワード設定
      </h2>

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
        <h3 style={{ fontSize: 15, fontWeight: 600, color: "#334155", marginBottom: 14 }}>
          好みのタグ
        </h3>
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

      {/* 保存ボタン */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
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
    </div>
  );
}
